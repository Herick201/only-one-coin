import { RecipientNotAllowedError, type NotificationProvider, type OutgoingEmail } from "../NotificationProvider.js";

export interface AllowlistGuardConfig {
  /** Off only in production. Everywhere else every recipient is checked. */
  enforce: boolean;
  /** Exact addresses (`qa@gmail.com`) or whole domains (`@nrlabsdigital.com`). */
  allowlist: readonly string[];
}

/**
 * "E-mail real disparado de staging" is a forbidden error with a mechanism
 * (CLAUDE.md §6) — this is the mechanism. It wraps whatever provider is in
 * place, so the guard holds no matter which adapter is behind it, and it
 * refuses before anything is rendered or sent.
 *
 * An empty allowlist with `enforce` on sends nothing at all, which is the
 * right default for an environment that forgot to configure one.
 */
export class AllowlistGuard implements NotificationProvider {
  private readonly addresses: Set<string>;
  private readonly domains: Set<string>;

  constructor(
    private readonly inner: NotificationProvider,
    private readonly config: AllowlistGuardConfig,
  ) {
    const entries = config.allowlist.map((entry) => entry.trim().toLowerCase()).filter(Boolean);
    this.addresses = new Set(entries.filter((entry) => !entry.startsWith("@")));
    this.domains = new Set(entries.filter((entry) => entry.startsWith("@")).map((entry) => entry.slice(1)));
  }

  allows(recipient: string): boolean {
    if (!this.config.enforce) return true;

    const address = recipient.trim().toLowerCase();
    if (this.addresses.has(address)) return true;

    const at = address.lastIndexOf("@");
    return at > 0 && this.domains.has(address.slice(at + 1));
  }

  async sendEmail(email: OutgoingEmail): Promise<{ providerId: string }> {
    if (!this.allows(email.to)) {
      throw new RecipientNotAllowedError();
    }
    return this.inner.sendEmail(email);
  }
}
