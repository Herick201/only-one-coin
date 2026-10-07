import {
  STUDENT_PASSWORD_MAX_LENGTH,
  STUDENT_PASSWORD_MIN_LENGTH,
  meetsStaffPasswordPolicy,
  meetsStudentPasswordPolicy,
  studentPasswordIssues,
} from "@ooc/domain";
import { describe, expect, it } from "vitest";

describe("student password policy", () => {
  it("accepts ten characters with a letter and a digit", () => {
    expect(STUDENT_PASSWORD_MIN_LENGTH).toBe(10);
    expect(meetsStudentPasswordPolicy("abcdefghi1")).toBe(true);
    expect(studentPasswordIssues("abcdefghi1")).toEqual([]);
  });

  it("names every rule a password breaks", () => {
    expect(studentPasswordIssues("abc")).toEqual(["too_short", "missing_digit"]);
    expect(studentPasswordIssues("1234567890")).toEqual(["missing_letter"]);
    expect(studentPasswordIssues("abcdefghijk")).toEqual(["missing_digit"]);
  });

  it("counts any script's letters, not only ASCII", () => {
    expect(meetsStudentPasswordPolicy("ñandúñandú1")).toBe(true);
  });

  it("refuses past the upper bound", () => {
    const long = `a1${"x".repeat(STUDENT_PASSWORD_MAX_LENGTH)}`;
    expect(studentPasswordIssues(long)).toEqual(["too_long"]);
  });

  it("stays stricter for staff", () => {
    expect(meetsStaffPasswordPolicy("abcdefghi1")).toBe(false);
    expect(meetsStaffPasswordPolicy("abcdefghijk1")).toBe(true);
  });
});
