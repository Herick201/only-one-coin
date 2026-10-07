import type { Role } from "@ooc/domain";

/**
 * Who registers, reads and corrects a student file: management and enrollment
 * supervision (CLAUDE.md §1, "/backoffice/students"). Editing went to the same
 * three as registration — `support` does not correct contact either (decision
 * of 07/10/2026, OOC-74).
 */
export const STUDENT_FILE_ROLES = ["master", "admin", "enrollment_supervisor"] as const satisfies readonly Role[];
