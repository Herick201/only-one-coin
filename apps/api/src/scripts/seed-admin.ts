import { sql } from "drizzle-orm";
import { container } from "@/container.js";
import { insertCredentialUser } from "@/infra/auth/credentialAccount.js";

// Local/dev default — a real run (staging/production DATABASE_URL) must
// override all three via env, never the well-known dev credential.
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@admin.com";
// Better Auth's default emailAndPassword policy refuses anything under 8
// characters (apps/api/src/infra/auth/betterAuth.ts) — not weakened here,
// since that floor applies to every real account, not just this one.
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
const NAME = process.env.SEED_ADMIN_NAME ?? "Admin";

// Bootstrap-only script: the first admin cannot come from
// PromoteUserRoleUseCase, since that usecase requires an existing admin to
// run it (CLAUDE.md §8). Writes the account directly
// (infra/auth/credentialAccount.ts) — Better Auth's sign-up is closed — and
// sets `role` to admin, the one place allowed to, because this never runs
// over HTTP.
//
// Rerunning is safe: an existing account is left as it is and only promoted.
async function main() {
  const existing = await container.db.execute(sql`select "id" from "user" where "email" = ${EMAIL.toLowerCase()}`);
  if (existing.rows.length === 0) {
    await insertCredentialUser(container.db, { email: EMAIL, name: NAME, role: "admin", password: PASSWORD });
    console.log(`Created ${EMAIL}`);
  } else {
    console.log(`${EMAIL} already exists — password left as it is`);
  }

  await container.db.execute(sql`update "user" set role = 'admin' where email = ${EMAIL.toLowerCase()}`);
  console.log(`${EMAIL} is now admin`);

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
