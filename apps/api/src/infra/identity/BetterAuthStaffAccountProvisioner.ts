import { sql } from "drizzle-orm";
import type { IStaffAccountProvisioner, ProvisionStaffAccountInput, ProvisionStaffAccountOutput } from "@ooc/domain";
import type { Auth } from "@/infra/auth/betterAuth.js";
import type { Db } from "@/infra/db/client.js";

/**
 * Same two-step shape as apps/api/src/scripts/seed-admin.ts, for the same
 * reason: `role` is `additionalFields`, `input:false` on the public sign-up
 * call (CLAUDE.md §8), so it has to be set in a second, direct write.
 */
export class BetterAuthStaffAccountProvisioner implements IStaffAccountProvisioner {
  constructor(
    private readonly auth: Auth,
    private readonly db: Db,
  ) {}

  async provision(input: ProvisionStaffAccountInput): Promise<ProvisionStaffAccountOutput> {
    const result = await this.auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
    });

    await this.db.execute(sql`update "user" set "role" = ${input.role} where "id" = ${result.user.id}`);

    return { userId: result.user.id };
  }
}
