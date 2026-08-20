import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import type { Config } from "@/config.js";

// Default cookie better-auth sets for the session token — "{prefix}.session_token",
// prefix "better-auth" unless overridden below. Keep in sync if `advanced.cookiePrefix`
// or `useSecureCookies` ever changes (docs/ARCHITECTURE.md §5.6).
export const SESSION_COOKIE_NAME = "better-auth.session_token";

export type Auth = ReturnType<typeof createAuth>;

export function createAuth(config: Config) {
  return betterAuth({
    database: new Pool({ connectionString: config.DATABASE_URL }),
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    // In dev/test also trust this process's own origin so the merged Swagger
    // UI (/docs, served by apps/api itself, not through the apps/app proxy)
    // can "try it out" against /api/auth/* without an origin mismatch.
    trustedOrigins:
      config.NODE_ENV === "production"
        ? [config.APP_PUBLIC_URL]
        : [config.APP_PUBLIC_URL, `http://localhost:${config.PORT}`],
    emailAndPassword: {
      enabled: true,
    },
    plugins: [openAPI({ disableDefaultReference: config.NODE_ENV === "production" })],
    user: {
      additionalFields: {
        // The "role" field is required for all users, but it is not exposed to the user
        role: {
          type: "string",
          required: true,
          input: false,
          defaultValue: "student",
        },
      },
    },
  });
}
