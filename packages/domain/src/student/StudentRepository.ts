import type { Student } from "./Student.js";

/**
 * Deliberately narrow — NOT IBaseRepository<Student>. There is no grant of
 * DELETE on students (CLAUDE.md §6, "sem grant de DELETE em student"), so a
 * generic delete() has no business being part of this contract.
 */
export interface IStudentRepository {
  create(student: Student): Promise<Student>;
}
