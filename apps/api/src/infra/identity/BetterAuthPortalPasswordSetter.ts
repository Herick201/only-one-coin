import type { IPortalPasswordSetter } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";
import { upsertCredentialPassword } from "@/infra/auth/credentialAccount.js";

/** A student account is born without a credential row (it is created on
 * approval, before anyone picks a password), so this upserts — unlike the
 * staff setter, which always finds one. */
export class BetterAuthPortalPasswordSetter implements IPortalPasswordSetter {
  constructor(private readonly db: Db) {}

  setPassword(userId: string, plainPassword: string): Promise<void> {
    return upsertCredentialPassword(this.db, userId, plainPassword);
  }
}
