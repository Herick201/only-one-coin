import { EmailDeliveryError, type NotificationProvider, type OutgoingEmail } from "../NotificationProvider.js";
import { renderEmail } from "../render/renderEmail.js";

export interface BrevoConfig {
  apiKey: string;
  sender: { email: string; name: string };
  /** Injected for tests; the global fetch otherwise. */
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Brevo transactional API, behind NotificationProvider (CLAUDE.md §3). The
 * e-mail is rendered here from the templates in this repository and sent as
 * finished HTML + text — no Brevo template id, so what the platform sends is
 * whatever is versioned in Git, not whatever someone last edited in the
 * Brevo dashboard.
 *
 * Retry policy is the caller's; this only classifies: 429 and 5xx and network
 * failures are retryable, any other 4xx is not.
 */
export class BrevoNotificationProvider implements NotificationProvider {
  private readonly fetch: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly config: BrevoConfig) {
    this.fetch = config.fetch ?? globalThis.fetch;
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  async sendEmail(email: OutgoingEmail): Promise<{ providerId: string }> {
    const rendered = renderEmail(email);

    let response: Response;
    try {
      response = await this.fetch(BREVO_SEND_URL, {
        method: "POST",
        headers: {
          "api-key": this.config.apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: this.config.sender,
          to: [{ email: email.to }],
          subject: rendered.subject,
          htmlContent: rendered.html,
          textContent: rendered.text,
          // Groups the Brevo statistics per template — the only metadata that
          // leaves, and it is a code, not anybody's data.
          tags: [email.templateKey],
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new EmailDeliveryError("brevo_network", true);
    }

    if (!response.ok) {
      const brevoCode = await readBrevoErrorCode(response);
      const retryable = response.status === 429 || response.status >= 500;
      throw new EmailDeliveryError(
        brevoCode ? `brevo_http_${response.status}_${brevoCode}` : `brevo_http_${response.status}`,
        retryable,
      );
    }

    const body = (await response.json().catch(() => null)) as { messageId?: unknown } | null;
    if (!body || typeof body.messageId !== "string") {
      // Accepted but unidentified: it most likely went out, so it is not
      // retried (a retry would risk a duplicate) — just recorded as such.
      return { providerId: "brevo:unknown" };
    }

    return { providerId: body.messageId };
  }
}

/** Brevo's error body is `{ code, message }`; only the code is kept (see
 * EmailDeliveryError — the message can carry the recipient). */
async function readBrevoErrorCode(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
  if (!body || typeof body.code !== "string") return null;
  return /^[a-z_]{1,64}$/.test(body.code) ? body.code : null;
}
