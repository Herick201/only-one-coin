import type { IStaffAccountProvisioner, ProvisionStaffAccountInput, ProvisionStaffAccountOutput } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";
import { insertCredentialUser } from "@/infra/auth/credentialAccount.js";

/**
 * Writes the account directly — Better Auth's sign-up is closed
 * (`disableSignUp`), server calls included. One transaction, so an invite
 * never leaves a "user" without its password behind.
 */
export class BetterAuthStaffAccountProvisioner implements IStaffAccountProvisioner {
  constructor(private readonly db: Db) {}

  async provision(input: ProvisionStaffAccountInput): Promise<ProvisionStaffAccountOutput> {
    const userId = await this.db.transaction((tx) =>
      insertCredentialUser(tx, { email: input.email, name: input.name, role: input.role, password: input.password }),
    );
    return { userId };
  }
}
