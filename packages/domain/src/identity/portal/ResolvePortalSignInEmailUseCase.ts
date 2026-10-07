import { BaseUseCase } from "../../shared/base/BaseUseCase.js";
import { PORTAL_SIGN_IN_SENTINEL_EMAIL, type PortalIdentifier } from "./PortalAccess.js";
import type { IPortalAccessRepository } from "./ports.js";

export interface ResolvePortalSignInEmailInput {
  identifier: PortalIdentifier | null;
}

/**
 * Turns either door (e-mail or document) into the address Better Auth signs
 * in with. Never says whether there is an account: no match — or a malformed
 * identifier — is the sentinel, and Better Auth answers it exactly like a wrong
 * password, in the same time (CLAUDE.md §8). The resolved address never leaves
 * the server.
 */
export class ResolvePortalSignInEmailUseCase extends BaseUseCase<ResolvePortalSignInEmailInput, string> {
  constructor(private readonly portalAccess: IPortalAccessRepository) {
    super();
  }

  async run(input: ResolvePortalSignInEmailInput): Promise<string> {
    if (!input.identifier) return PORTAL_SIGN_IN_SENTINEL_EMAIL;
    const account = await this.portalAccess.findAccountByIdentifier(input.identifier);
    return account?.email ?? PORTAL_SIGN_IN_SENTINEL_EMAIL;
  }
}
