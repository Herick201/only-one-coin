import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  type IEmailVerificationRepository,
  type IssueEmailVerificationOutcome,
  type IssueEmailVerificationRequest,
  type LatestEmailVerification,
} from "@ooc/domain";
import { emailVerifications, seatHolds } from "@ooc/db";
import { and, desc, eq, gt, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * The checkout's e-mail proof (spec 2026-10-07). Every clock decision —
 * expiry, cooldown — is taken on the database clock, in SQL.
 */
export class DrizzleEmailVerificationRepository implements IEmailVerificationRepository {
  constructor(private readonly db: Db) {}

  async issue(request: IssueEmailVerificationRequest): Promise<IssueEmailVerificationOutcome> {
    return this.db.transaction(async (tx) => {
      // FOR UPDATE serializes two sends for the same hold, so the cooldown and
      // the send cap below cannot both be passed by a double click.
      const [hold] = await tx
        .select({ id: seatHolds.id })
        .from(seatHolds)
        .where(and(eq(seatHolds.id, request.seatHoldId), eq(seatHolds.status, "active"), gt(seatHolds.expiresAt, sql`now()`)))
        .for("update");
      if (!hold) return "hold_expired";

      const [stats] = await tx
        .select({
          sends: sql<number>`count(*)::int`,
          coolingDown: sql<boolean>`coalesce(bool_or(${emailVerifications.createdAt} > now() - make_interval(secs => ${request.cooldownSeconds}::int)), false)`,
        })
        .from(emailVerifications)
        .where(eq(emailVerifications.seatHoldId, hold.id));
      if (stats?.coolingDown) return "cooldown";
      if ((stats?.sends ?? 0) >= request.maxSends) return "too_many_sends";

      // Only the newest code works.
      await tx
        .update(emailVerifications)
        .set({ expiresAt: sql`now()`, updatedAt: sql`now()` })
        .where(
          and(
            eq(emailVerifications.seatHoldId, hold.id),
            isNull(emailVerifications.verifiedAt),
            gt(emailVerifications.expiresAt, sql`now()`),
          ),
        );

      await tx.insert(emailVerifications).values({
        id: request.id,
        seatHoldId: hold.id,
        email: request.email,
        codeHash: request.codeHash,
        expiresAt: sql`now() + make_interval(mins => ${request.ttlMinutes}::int)`,
      });
      await insertOutboxEmails(tx, request.notifications);
      return "issued";
    });
  }

  async findLatest(params: { seatHoldId: string; email: string }): Promise<LatestEmailVerification | null> {
    const [row] = await this.db
      .select({
        id: emailVerifications.id,
        codeHash: emailVerifications.codeHash,
        attempts: emailVerifications.attempts,
        expired: sql<boolean>`${emailVerifications.expiresAt} <= now()`,
        verified: sql<boolean>`${emailVerifications.verifiedAt} is not null`,
      })
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.seatHoldId, params.seatHoldId),
          eq(emailVerifications.email, params.email),
          isNull(emailVerifications.consumedAt),
        ),
      )
      .orderBy(desc(emailVerifications.createdAt), desc(emailVerifications.id))
      .limit(1);
    return row ?? null;
  }

  async recordFailedAttempt(id: string): Promise<number> {
    const [row] = await this.db
      .update(emailVerifications)
      .set({ attempts: sql`${emailVerifications.attempts} + 1`, updatedAt: sql`now()` })
      .where(and(eq(emailVerifications.id, id), lt(emailVerifications.attempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)))
      .returning({ attempts: emailVerifications.attempts });
    return row?.attempts ?? EMAIL_VERIFICATION_MAX_ATTEMPTS;
  }

  async markVerified(id: string): Promise<boolean> {
    const rows = await this.db
      .update(emailVerifications)
      .set({ verifiedAt: sql`now()`, updatedAt: sql`now()` })
      .where(
        and(
          eq(emailVerifications.id, id),
          isNull(emailVerifications.verifiedAt),
          gt(emailVerifications.expiresAt, sql`now()`),
          lt(emailVerifications.attempts, EMAIL_VERIFICATION_MAX_ATTEMPTS),
        ),
      )
      .returning({ id: emailVerifications.id });
    return rows.length > 0;
  }
}

/**
 * Called by the public submit with ITS transaction: takes the verified,
 * unconsumed proof for this hold and address and marks it consumed. `false`
 * means there is none — the submit refuses and rolls everything back.
 * Expiry does not matter here: the proof lives as long as its seat hold, and
 * the submit has already locked a live one.
 */
export async function consumeVerifiedEmail(
  tx: Pick<Tx, "select" | "update">,
  params: { seatHoldId: string; email: string },
): Promise<boolean> {
  const [proof] = await tx
    .select({ id: emailVerifications.id })
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.seatHoldId, params.seatHoldId),
        eq(emailVerifications.email, params.email),
        isNotNull(emailVerifications.verifiedAt),
        isNull(emailVerifications.consumedAt),
      ),
    )
    .orderBy(desc(emailVerifications.verifiedAt))
    .limit(1)
    .for("update");
  if (!proof) return false;

  await tx
    .update(emailVerifications)
    .set({ consumedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(emailVerifications.id, proof.id));
  return true;
}
