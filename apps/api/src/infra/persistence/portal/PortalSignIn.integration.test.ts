import * as schema from "@ooc/db";
import { students } from "@ooc/db";
import {
  CompletePortalAccessUseCase,
  ResolvePortalSignInEmailUseCase,
  newPortalToken,
  parsePortalIdentifier,
  type AuditLogEntry,
  type IAuditLogRepository,
} from "@ooc/domain";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Config } from "@/config.js";
import type { Db } from "@/infra/db/client.js";
import { createAuth, type Auth } from "@/infra/auth/betterAuth.js";
import { BetterAuthPortalPasswordSetter } from "@/infra/identity/BetterAuthPortalPasswordSetter.js";
import { BetterAuthStaffSessionRevoker } from "@/infra/identity/BetterAuthStaffSessionRevoker.js";
import { DrizzlePortalAccessRepository } from "./DrizzlePortalAccessRepository.js";

/**
 * The definition of done (spec 2026-10-05 §9), end to end against Postgres
 * and the real Better Auth: an approved student sets a password from the link
 * and signs in by e-mail or by document; anything else never gets a session.
 *
 * Committed, not rolled back — Better Auth reads through its own pool. The
 * student file stays (students are under the delete lock, 0011), with a
 * document and e-mail unique to this run.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for this suite.");

const RUN = Date.now().toString().slice(-8);
const EMAIL = `e2e.${RUN}@gmail.com`;
const DOCUMENT = RUN.padStart(8, "1");

class MemoryAudit implements IAuditLogRepository {
  entries: AuditLogEntry[] = [];
  async append(entry: AuditLogEntry) {
    this.entries.push(entry);
  }
}

let pool: pg.Pool;
let db: Db;
let auth: Auth;
let repo: DrizzlePortalAccessRepository;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
  db = drizzle(pool, { schema, casing: "snake_case" });
  auth = createAuth({
    NODE_ENV: "test",
    PORT: 3333,
    DATABASE_URL,
    BETTER_AUTH_URL: "http://localhost:3333/api/auth",
    BETTER_AUTH_SECRET: "integration-secret-at-least-32-characters",
    APP_PUBLIC_URLS: ["http://localhost:3000"],
  } as Config);
  repo = new DrizzlePortalAccessRepository(db);
});
afterAll(async () => {
  await pool.end();
});

async function signIn(raw: unknown, password: string) {
  const email = await new ResolvePortalSignInEmailUseCase(repo).run({ identifier: parsePortalIdentifier(raw) });
  return auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
}

describe("student portal sign-in, end to end", () => {
  it("only a real credential gets a session", async () => {
    const [student] = await db
      .insert(students)
      .values({
        firstName: "E2E",
        lastName: "Alumna",
        nationalIdType: "DNI",
        nationalId: DOCUMENT,
        email: EMAIL,
        phone: "999999999",
        birthDate: new Date("2008-01-01T00:00:00.000Z"),
        country: "PE",
        city: "Lima",
      })
      .returning({ id: students.id });

    const activation = newPortalToken("activation");
    expect(await repo.provision({ studentId: student!.id, actorId: "e2e", activation, at: new Date(), notify: () => [] })).toBe("created");

    // Before the password is set: nobody gets in.
    await expect(signIn({ method: "email", identifier: EMAIL }, "anything-12")).rejects.toThrow();

    await new CompletePortalAccessUseCase(repo, new BetterAuthPortalPasswordSetter(db), new BetterAuthStaffSessionRevoker(auth, db), new MemoryAudit()).run({
      token: activation.token,
      password: "clave-segura-1",
    });

    const byEmail = await signIn({ method: "email", identifier: EMAIL.toUpperCase() }, "clave-segura-1");
    const cookie = byEmail.headers.getSetCookie().find((c) => c.includes("session_token"));
    expect(cookie).toBeTruthy();
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookie!.split(";")[0]! }) });
    expect((session?.user as unknown as { role: string } | undefined)?.role).toBe("student");

    const byDocument = await signIn({ method: "national_id", nationalIdType: "DNI", identifier: `${DOCUMENT.slice(0, 2)}.${DOCUMENT.slice(2, 5)}.${DOCUMENT.slice(5)}` }, "clave-segura-1");
    expect(byDocument.headers.getSetCookie().some((c) => c.includes("session_token"))).toBe(true);

    await expect(signIn({ method: "email", identifier: EMAIL }, "clave-errada-1")).rejects.toThrow();
    await expect(signIn({ method: "national_id", nationalIdType: "CE", identifier: DOCUMENT }, "clave-segura-1")).rejects.toThrow();
    await expect(signIn({ method: "email", identifier: "no-es-correo" }, "clave-segura-1")).rejects.toThrow();
  });
});
