import type { Guardian } from "./Guardian.js";

/** Deliberately narrow — see StudentRepository.ts for why this isn't
 * IBaseRepository<Guardian>. */
export interface IGuardianRepository {
  create(guardian: Guardian): Promise<Guardian>;
}
