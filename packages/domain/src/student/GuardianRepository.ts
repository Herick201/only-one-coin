import type { Guardian } from "./Guardian.js";

/** Deliberately narrow — see StudentRepository.ts for why this isn't
 * IBaseRepository<Guardian>. */
export interface IGuardianRepository {
  create(guardian: Guardian): Promise<Guardian>;

  /** The student's live guardian, if any — one per student (`guardians.student_id` is unique). */
  findByStudentId(studentId: string): Promise<Guardian | null>;

  /** Writes the entity's current fields over its row (OOC-74). */
  update(guardian: Guardian): Promise<Guardian>;
}
