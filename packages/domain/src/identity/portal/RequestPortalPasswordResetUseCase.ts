import type { Locale } from "../../notification/EmailNotification.js";
import { BaseUseCase } from "../../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../ports/IAuditLogRepository.js";
import { PORTAL_TOKEN_COOLDOWN_SECONDS, newPortalToken, type PortalIdentifier } from "./PortalAccess.js";
import { portalCredentialsEmail, portalPasswordResetEmail } from "./portalEmails.js";
import type { IPortalAccessRepository, IPortalLinkBuilder } from "./ports.js";

export interface RequestPortalPasswordResetInput {
  identifier: PortalIdentifier | null;
  /** The language of the screen the request came from. */
  locale: Locale;
}

/**
 * "Forgot my password" on the student login. Returns nothing on every path
 * (CLAUDE.md §8): no account, a malformed identifier and a request inside the
 * cooldown end exactly like a link that went out.
 *
 * An account that never set a password gets its activation again — whoever
 * lost the first e-mail recovers through the same button.
 */
export class RequestPortalPasswordResetUseCase extends BaseUseCase<RequestPortalPasswordResetInput, void> {
  constructor(
    private readonly portalAccess: IPortalAccessRepository,
    private readonly links: IPortalLinkBuilder,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: RequestPortalPasswordResetInput): Promise<void> {
    if (!input.identifier) return;
    const account = await this.portalAccess.findAccountByIdentifier(input.identifier);
    if (!account) return;

    const now = new Date();
    const purpose = account.hasPassword ? "reset" : "activation";
    const token = newPortalToken(purpose, now);
    const url = this.links.access(token.token, input.locale);
    const issued = await this.portalAccess.issueToken({
      userId: account.userId,
      token,
      cooldownSince: new Date(now.getTime() - PORTAL_TOKEN_COOLDOWN_SECONDS * 1000),
      notify: (tokenId) => [
        purpose === "reset"
          ? portalPasswordResetEmail(account, url, tokenId, input.locale)
          : portalCredentialsEmail(account, url, tokenId, input.locale),
      ],
    });
    if (!issued) return;

    await this.auditLog.append({
      actorId: account.userId,
      action: "portal.password_reset_requested",
      targetId: account.userId,
      metadata: { purpose },
      at: now,
    });
  }
}
