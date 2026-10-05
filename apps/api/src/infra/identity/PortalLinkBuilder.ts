import type { IPortalLinkBuilder, Locale } from "@ooc/domain";

/** apps/app routes on short codes with the default unprefixed (same table as
 * BackofficePasswordResetLinkBuilder). */
const APP_LOCALE_PREFIX: Record<Locale, string> = { "es-PE": "", "pt-BR": "/pt", en: "/en" };

/** `/[locale]/access/[token]` on the student portal's public origin — the
 * page sets the password for both an activation and a reset. */
export class PortalLinkBuilder implements IPortalLinkBuilder {
  constructor(private readonly portalOrigin: string) {}

  access(token: string, locale: Locale): string {
    return `${this.portalOrigin}${APP_LOCALE_PREFIX[locale]}/access/${encodeURIComponent(token)}`;
  }
}
