import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `@ooc/domain/fields` — the person-record field rules, shared with apps/api
  // (OOC-64) — is exported as raw .ts so this build never depends on the
  // domain package's dist/. Only that subpath: the rest of the domain package
  // stays out of the browser.
  transpilePackages: ['@ooc/domain'],
}

export default withNextIntl(nextConfig)
