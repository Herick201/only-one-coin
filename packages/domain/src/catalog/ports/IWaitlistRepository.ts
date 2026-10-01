import type { WaitlistEntry } from "../WaitlistEntry.js";

/**
 * Where a student stands towards a class group's waitlist: not on file (or
 * retired), already holding a live seat there, or free to queue.
 */
export type WaitlistStudentStanding = "missing" | "enrolled" | "free";

/**
 * No delete: leaving the queue is marked (left_at + left_reason), never
 * removed. The 'enrolled' exit is not here — the manual enrollment writes it
 * in its own transaction (IEnrollmentRepository.createWithPayment).
 */
export interface IWaitlistRepository {
  studentStanding(studentId: string, classGroupId: string): Promise<WaitlistStudentStanding>;
  /**
   * Throws WaitlistAlreadyJoinedError when the student already has an active
   * place in that class group's queue — answered by the partial unique index,
   * not by a read ahead of the write.
   */
  join(entry: WaitlistEntry): Promise<WaitlistEntry>;
  findById(id: string): Promise<WaitlistEntry | null>;
  /**
   * Writes the exit only on a still-open entry. Throws WaitlistEntryClosedError
   * when somebody (or the enrollment) closed it in between.
   */
  leave(entry: WaitlistEntry): Promise<void>;
}
