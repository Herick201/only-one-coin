import { BaseUseCase } from "../../shared/base/BaseUseCase.js";
import { HttpError } from "../../shared/base/errors/HttpError.js";
import { UnableToProcessEntryError } from "../../shared/base/errors/UnableToProcessEntryError.js";
import type { IAuditLogRepository } from "../ports/IAuditLogRepository.js";
import type { IStaffSessionRevoker } from "../ports/IStaffSessionRevoker.js";
import { meetsStudentPasswordPolicy } from "../StudentPasswordPolicy.js";
import { hashPortalToken, type PortalAccessTokenPurpose } from "./PortalAccess.js";
import type { IPortalAccessRepository, IPortalPasswordSetter } from "./ports.js";

export interface CompletePortalAccessInput {
  token: string;
  password: string;
}

export interface CompletePortalAccessOutput {
  userId: string;
  purpose: PortalAccessTokenPurpose;
}

function linkInvalid(): HttpError {
  return new HttpError({ status: 410, reason: "portal_access.link_invalid", message: "Portal access link is unknown, used or expired." });
}

/**
 * Sets the password from an activation or reset link. Unknown, used and
 * expired are one answer. The link is burned before the password is written:
 * two clicks race to `consumeToken`, and only one wins. If writing the
 * password then fails, the link is already spent: the student asks for a new
 * one ("forgot my password"), which is the accepted cost of that ordering.
 *
 * Every session on the account is closed — same stance as the staff reset: a
 * session opened with the old password must not outlive it. The session
 * revoker is the staff one; its `revokeAll` deletes rows of Better Auth's
 * "session" table by user, whoever the user is.
 */
export class CompletePortalAccessUseCase extends BaseUseCase<CompletePortalAccessInput, CompletePortalAccessOutput> {
  constructor(
    private readonly portalAccess: IPortalAccessRepository,
    private readonly passwordSetter: IPortalPasswordSetter,
    private readonly sessionRevoker: IStaffSessionRevoker,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CompletePortalAccessInput): Promise<CompletePortalAccessOutput> {
    const token = await this.portalAccess.findToken(hashPortalToken(input.token));
    if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) throw linkInvalid();

    if (!meetsStudentPasswordPolicy(input.password)) {
      throw new UnableToProcessEntryError({
        reason: "portal_access.weak_password",
        message: "The password does not meet the student password policy.",
      });
    }

    if (!(await this.portalAccess.consumeToken(token.id))) throw linkInvalid();
    await this.passwordSetter.setPassword(token.userId, input.password);
    const sessionsClosed = await this.sessionRevoker.revokeAll(token.userId);

    await this.auditLog.append({
      actorId: token.userId,
      action: "portal.password_set",
      targetId: token.userId,
      metadata: { purpose: token.purpose, sessionsClosed },
      at: new Date(),
    });

    return { userId: token.userId, purpose: token.purpose };
  }
}
