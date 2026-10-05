import { ConflictError } from "@ooc/domain";
import type { IStaffAccountProvisioner, ProvisionStaffAccountInput, ProvisionStaffAccountOutput } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";
import { insertCredentialUser } from "@/infra/auth/credentialAccount.js";

const PG_UNIQUE_VIOLATION = "23505";

/** drizzle wraps the driver error, so the pg code can sit on `cause`. */
function isUniqueViolation(error: unknown): boolean {
  for (let current: unknown = error, depth = 0; current && depth < 4; depth += 1) {
    if (typeof current === "object" && (current as { code?: unknown }).code === PG_UNIQUE_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Writes the account directly — Better Auth's sign-up is closed
 * (`disableSignUp`), server calls included. One transaction, so an invite
 * never leaves a "user" without its password behind. An e-mail that already
 * has an account is a 409, as Better Auth's sign-up used to answer.
 */
export class BetterAuthStaffAccountProvisioner implements IStaffAccountProvisioner {
  constructor(private readonly db: Db) {}

  async provision(input: ProvisionStaffAccountInput): Promise<ProvisionStaffAccountOutput> {
    try {
      const userId = await this.db.transaction((tx) =>
        insertCredentialUser(tx, { email: input.email, name: input.name, role: input.role, password: input.password }),
      );
      return { userId };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError({
          reason: "staff_invite.email_taken",
          message: "An account with this e-mail already exists.",
          cause: error,
        });
      }
      throw error;
    }
  }
}
