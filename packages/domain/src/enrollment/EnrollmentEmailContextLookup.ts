/**
 * What the manual enrollment path has to read before it can say anything to
 * the student: it only receives a `studentId` (the student is already on
 * file, CLAUDE.md §1), so their name, e-mail, age and guardian — and the
 * course the class group belongs to — come from here.
 *
 * Read-only and deliberately narrow, same spirit as `IPlanPriceLookup`: this
 * context never needs the student aggregate, only who to write to.
 */
export interface EnrollmentEmailContext {
  student: { firstName: string; lastName: string; email: string; birthDate: Date };
  /** The guardian on file, if any; a retired one does not count. */
  guardian: { firstName: string; email: string } | null;
  courseName: string;
  classGroupStartsOn: Date;
}

export interface IEnrollmentEmailContextLookup {
  /** Null when the student or the class group is not on file — the write
   * that follows fails on its own terms, this lookup does not pre-empt it. */
  find(params: { studentId: string; classGroupId: string }): Promise<EnrollmentEmailContext | null>;
}
