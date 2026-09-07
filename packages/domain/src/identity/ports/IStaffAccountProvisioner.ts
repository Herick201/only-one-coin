import type { Role } from "../Role.js";

export interface ProvisionStaffAccountInput {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export interface ProvisionStaffAccountOutput {
  userId: string;
}

/**
 * Turns a completed invite into a real account. Two steps under the hood
 * (sign up, then set `role`), the same shape `apps/api/src/scripts/seed-admin.ts`
 * already uses and for the same reason: `role` is `additionalFields`,
 * `input:false` on the public sign-up call (CLAUDE.md §8).
 */
export interface IStaffAccountProvisioner {
  provision(input: ProvisionStaffAccountInput): Promise<ProvisionStaffAccountOutput>;
}
