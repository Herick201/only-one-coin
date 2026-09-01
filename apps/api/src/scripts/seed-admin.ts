import { sql } from "drizzle-orm";
import { container } from "@/container.js";

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
// run it (CLAUDE.md §8, "Bootstrap: o primeiro admin nasce por migration
// versionada"). Signs up through Better Auth itself so the password gets a
// real hash, then flips `role` directly in the database — the one place
// allowed to bypass `additionalFields.role.input:false`, because this never
// runs over HTTP.
//
// Rerunning is safe: signUpEmail fails harmlessly if the account already
// exists, and the role UPDATE always runs.
async function main() {
  try {
    await container.auth.api.signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: NAME } });
    console.log(`Created ${EMAIL}`);
  } catch (error) {
    // Most likely the account already exists (safe to ignore, rerunning is
    // the whole point) — but logged either way, since a rejected password or
    // a DB error would otherwise look identical and the UPDATE below would
    // silently affect zero rows.
    console.log(`signUpEmail did not create ${EMAIL}: ${error instanceof Error ? error.message : error}`);
  }

  await container.db.execute(sql`update "user" set role = 'admin' where email = ${EMAIL}`);
  console.log(`${EMAIL} / ${PASSWORD} is now admin`);

  process.exit(0);
}

main();
