import { randomBytes } from "node:crypto";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "./ports/IAuditLogRepository.js";
import type { IStaffPasswordResetRepository, StaffPasswordReset } from "./ports/IStaffPasswordResetRepository.js";

const RESET_TTL_HOURS = 24;

export interface CreateStaffPasswordResetInput {
  actorId: string;
  targetUserId: string;
}

export interface CreateStaffPasswordResetOutput {
  reset: StaffPasswordReset;
}

/**
 * Opens a one-time link to set a new password on an account that already
 * exists — the answer to "forgot the password" (CLAUDE.md §8 doesn't cover
 * this case explicitly; it follows the same shape as `CreateStaffInviteUseCase`
 * because the operational need is identical: a link an admin copies and sends
 * by hand). A short TTL (24h, vs. the invite's 7 days) — unlike a fresh
 * invite this touches an account somebody can already sign into, so the
 * window a stray link stays valid is kept tight.
 *
 * Reuses any still-pending reset for the same user instead of stacking a
 * second one — `IStaffPasswordResetRepository`'s unique-pending-per-user
 * constraint would reject a second `create` anyway; this just makes the
 * repeat click a renew instead of an error.
 */
export class CreateStaffPasswordResetUseCase extends BaseUseCase<
  CreateStaffPasswordResetInput,
  CreateStaffPasswordResetOutput
> {
  constructor(
    private readonly staffPasswordResetRepository: IStaffPasswordResetRepository,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CreateStaffPasswordResetInput): Promise<CreateStaffPasswordResetOutput> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TTL_HOURS);

    const existing = await this.staffPasswordResetRepository.findPendingByUserId(input.targetUserId);
    if (existing) {
      await this.staffPasswordResetRepository.renew(existing.id, expiresAt);
      return { reset: { ...existing, expiresAt } };
    }

    const token = randomBytes(32).toString("base64url");
    const reset = await this.staffPasswordResetRepository.create({
      userId: input.targetUserId,
      token,
      requestedBy: input.actorId,
      expiresAt,
    });

    await this.auditLogRepository.append({
      actorId: input.actorId,
      action: "staff.password_reset_created",
      targetId: input.targetUserId,
      metadata: {},
      at: new Date(),
    });

    return { reset };
  }
}
