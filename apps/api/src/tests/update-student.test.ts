import { describe, expect, it } from "vitest";
import {
  Guardian,
  GuardianRequiredForMinorError,
  InvalidFieldsError,
  SaveGuardianUseCase,
  Student,
  StudentAlreadyRegisteredError,
  StudentNotFoundError,
  UpdateStudentUseCase,
  type NationalIdType,
} from "@ooc/domain";
import { FakeAuditLogRepository } from "./fakes/catalog.js";
import { FakeGuardianRepository, FakeStudentRepository } from "./fakes/student.js";

/**
 * OOC-74: a staff correction to the student file is held to registration's
 * rules, and the audit line names what changed — never the values, which an
 * append-only log could not erase on request (Ley 29733).
 */

const ADULT = {
  firstName: "Rosa",
  lastName: "Quispe",
  nationalIdType: "DNI" as NationalIdType,
  nationalId: "70123456",
  email: "rosa.quispe@gmail.com",
  phone: "+51987654321",
  birthDate: new Date("1996-04-12T00:00:00.000Z"),
  country: "PE",
  region: "Lima",
  city: "Chorrillos",
};

const GUARDIAN = {
  firstName: "Ana",
  lastName: "Quispe",
  relationship: "mother" as const,
  nationalIdType: "DNI" as NationalIdType,
  nationalId: "40123456",
  email: "ana@hotmail.com",
  phone: "+51987654322",
};

/** Ten years old today, whatever today is. */
const CHILD_BIRTH_DATE = new Date(Date.UTC(new Date().getUTCFullYear() - 10, 0, 1));

function setup(options: { withGuardian?: boolean; others?: Student[] } = {}) {
  const student = Student.create(ADULT);
  const students = new FakeStudentRepository(student, ...(options.others ?? []));
  const guardians = new FakeGuardianRepository(
    ...(options.withGuardian ? [Guardian.create({ ...GUARDIAN, studentId: student.id })] : []),
  );
  const audit = new FakeAuditLogRepository();
  return {
    student,
    students,
    guardians,
    audit,
    update: new UpdateStudentUseCase(students, guardians, audit),
    saveGuardian: new SaveGuardianUseCase(students, guardians, audit),
  };
}

describe("UpdateStudentUseCase", () => {
  it("rewrites the record and audits the names of the fields that changed", async () => {
    const { student, students, audit, update } = setup();

    const saved = await update.run({
      actorId: "staff-1",
      studentId: student.id,
      student: { ...ADULT, firstName: "Rosa María", phone: "+51911111111" },
    });

    expect(saved.firstName).toBe("Rosa María");
    expect(students.updated).toHaveLength(1);
    expect(audit.appended).toEqual([
      expect.objectContaining({
        actorId: "staff-1",
        action: "student.updated",
        targetId: student.id,
        metadata: { fields: ["firstName", "phone"] },
      }),
    ]);
    expect(JSON.stringify(audit.appended)).not.toContain("Rosa María");
  });

  it("writes nothing when nothing changed", async () => {
    const { student, students, audit, update } = setup();

    await update.run({ actorId: "staff-1", studentId: student.id, student: { ...ADULT } });

    expect(students.updated).toHaveLength(0);
    expect(audit.appended).toHaveLength(0);
  });

  it("normalizes the document before comparing — punctuation is not a change", async () => {
    const { student, audit, update } = setup();

    await update.run({ actorId: "staff-1", studentId: student.id, student: { ...ADULT, nationalId: "70.123.456" } });

    expect(audit.appended).toHaveLength(0);
  });

  it("refuses a document already on another person's file", async () => {
    const other = Student.create({ ...ADULT, nationalId: "70999999", email: "otro@gmail.com" });
    const { student, students, update } = setup({ others: [other] });

    await expect(
      update.run({ actorId: "staff-1", studentId: student.id, student: { ...ADULT, nationalId: "70999999" } }),
    ).rejects.toBeInstanceOf(StudentAlreadyRegisteredError);
    expect(students.updated).toHaveLength(0);
  });

  it("refuses a birth date that makes the student a minor with no guardian on file", async () => {
    const { student, update } = setup();

    await expect(
      update.run({ actorId: "staff-1", studentId: student.id, student: { ...ADULT, birthDate: CHILD_BIRTH_DATE } }),
    ).rejects.toBeInstanceOf(GuardianRequiredForMinorError);
  });

  it("accepts that birth date once a guardian is on file", async () => {
    const { student, update } = setup({ withGuardian: true });

    const saved = await update.run({
      actorId: "staff-1",
      studentId: student.id,
      student: { ...ADULT, birthDate: CHILD_BIRTH_DATE },
    });

    expect(saved.isMinor).toBe(true);
  });

  it("refuses invalid fields with the same codes as registration", async () => {
    const { student, update } = setup();

    await expect(
      update.run({ actorId: "staff-1", studentId: student.id, student: { ...ADULT, nationalId: "1234" } }),
    ).rejects.toBeInstanceOf(InvalidFieldsError);
  });

  it("answers not found for an unknown student", async () => {
    const { update } = setup();

    await expect(
      update.run({ actorId: "staff-1", studentId: "018f2b5c-0000-7000-8000-0000000000aa", student: ADULT }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });
});

describe("SaveGuardianUseCase", () => {
  it("puts a guardian on file when the student has none — consent stays pending", async () => {
    const { student, guardians, audit, saveGuardian } = setup();

    const saved = await saveGuardian.run({ actorId: "staff-1", studentId: student.id, guardian: GUARDIAN });

    expect(saved.studentId).toBe(student.id);
    expect(guardians.created).toHaveLength(1);
    expect(audit.appended).toEqual([
      expect.objectContaining({ action: "student.guardian_added", targetId: student.id }),
    ]);
  });

  it("corrects the guardian on file instead of adding a second one", async () => {
    const { student, guardians, audit, saveGuardian } = setup({ withGuardian: true });

    await saveGuardian.run({
      actorId: "staff-1",
      studentId: student.id,
      guardian: { ...GUARDIAN, email: "ana.quispe@hotmail.com" },
    });

    expect(guardians.created).toHaveLength(0);
    expect(guardians.updated).toHaveLength(1);
    expect(audit.appended).toEqual([
      expect.objectContaining({ action: "student.guardian_updated", metadata: { fields: ["email"] } }),
    ]);
  });

  it("writes nothing when the guardian did not change", async () => {
    const { student, guardians, audit, saveGuardian } = setup({ withGuardian: true });

    await saveGuardian.run({ actorId: "staff-1", studentId: student.id, guardian: GUARDIAN });

    expect(guardians.updated).toHaveLength(0);
    expect(audit.appended).toHaveLength(0);
  });

  it("answers not found for an unknown student", async () => {
    const { saveGuardian } = setup();

    await expect(
      saveGuardian.run({ actorId: "staff-1", studentId: "018f2b5c-0000-7000-8000-0000000000aa", guardian: GUARDIAN }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });
});
