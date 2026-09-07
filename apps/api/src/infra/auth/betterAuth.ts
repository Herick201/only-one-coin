import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { admin, openAPI } from "better-auth/plugins";
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
    plugins: [
      openAPI({ disableDefaultReference: config.NODE_ENV === "production" }),
      // Enables Better Auth's own sign-in-blocking hook for a banned account
      // (CLAUDE.md §8, "remover acesso ao painel"). Its `banUser`/`unbanUser`
      // API routes are not used — apps/api writes `banned` directly
      // (DrizzleStaffAccessRepository), which this plugin's own
      // `session.create` hook enforces regardless of how the column was set.
      //
      // `defaultRole` must match `additionalFields.role.defaultValue` below:
      // the plugin's own `user.create.before` hook writes its `defaultRole`
      // into the row ahead of our own default being applied, so leaving it at
      // the plugin's own default ("user") fails "user"."role"'s CHECK
      // constraint (only the roles in packages/domain/src/identity/Role.ts
      // are valid) on every sign-up — caught by actually completing an invite
      // end to end, not by reading the plugin's source.
      admin({ defaultRole: "student" }),
    ],
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
