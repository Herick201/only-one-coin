import { randomUUID } from "node:crypto";
import type { NotificationProvider, OutgoingEmail } from "../NotificationProvider.js";
import { renderEmail } from "../render/renderEmail.js";

export interface NotificationLogger {
  info(obj: object, msg: string): void;
}

/**
 * For an environment with no Brevo key (local development, CI). It still
 * renders the template — a broken template fails here exactly as it would in
 * production — and then only logs that it would have sent. Never the
 * recipient or the content: those are PII (CLAUDE.md §6).
 */
export class LogNotificationProvider implements NotificationProvider {
  constructor(private readonly logger: NotificationLogger) {}

  async sendEmail(email: OutgoingEmail): Promise<{ providerId: string }> {
    const rendered = renderEmail(email);
    const providerId = `log:${randomUUID()}`;
    this.logger.info(
      { templateKey: email.templateKey, locale: email.locale, htmlBytes: rendered.html.length, providerId },
      "e-mail rendered, not sent (no e-mail provider configured)",
    );
    return { providerId };
  }
}
