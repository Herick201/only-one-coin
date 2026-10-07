import { describe, expect, it } from "vitest";
import { RegisterStudentUseCase, Student, StudentAlreadyRegisteredError, type NationalIdType } from "@ooc/domain";
import { FakeAuditLogRepository } from "./fakes/catalog.js";
import { FakeGuardianRepository, FakeStudentRepository } from "./fakes/student.js";

/**
 * One person, one record (CLAUDE.md §1 — "puxando o cadastro existente, nunca
 * duplicando `student`"). Until this rule existed, every path that wrote a
 * student inserted blindly, so the same DNI could open as many files as it was
 * typed times — and each file took a slice of the person's history with it.
 *
 * The usecase is pure domain, so the repositories here are fakes: no Postgres,
 * no container. What the database contributes to the same rule (the unique
 * index that holds when two staff members save the same document in the same
 * instant) is a migration, and is not what this test covers.
 */

const A_STUDENT = {
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

describe("RegisterStudentUseCase — one person, one record", () => {
  it("registers somebody whose document is not on file yet", async () => {
    const students = new FakeStudentRepository();
    const usecase = new RegisterStudentUseCase(students, new FakeGuardianRepository(), new FakeAuditLogRepository());

    const result = await usecase.run({ actorId: "staff-1", student: A_STUDENT, guardian: null });

    expect(result.student.nationalId).toBe("70123456");
    expect(students.created).toHaveLength(1);
  });

  it("refuses a second file for a document already registered", async () => {
    const onFile = Student.create(A_STUDENT);
    const students = new FakeStudentRepository(onFile);
    const usecase = new RegisterStudentUseCase(students, new FakeGuardianRepository(), new FakeAuditLogRepository());

    // Same human being, retyped: a different spelling and a new e-mail are
    // exactly how a duplicate used to get in.
    await expect(
      usecase.run({
        actorId: "staff-1",
        student: { ...A_STUDENT, firstName: "ROSA", email: "rosa.q.2026@gmail.com" },
        guardian: null,
      }),
    ).rejects.toBeInstanceOf(StudentAlreadyRegisteredError);

    expect(students.created).toHaveLength(0);
  });

  it("lets the same person through when the document differs", async () => {
    const onFile = Student.create(A_STUDENT);
    const students = new FakeStudentRepository(onFile);
    const usecase = new RegisterStudentUseCase(students, new FakeGuardianRepository(), new FakeAuditLogRepository());

    // A passport and a DNI carrying the same digits are two different
    // documents — the pair is what identifies, never the number alone.
    const result = await usecase.run({
      actorId: "staff-1",
      student: { ...A_STUDENT, nationalIdType: "passport" },
      guardian: null,
    });

    expect(result.student.nationalIdType).toBe("passport");
    expect(students.created).toHaveLength(1);
  });

  it("audits the registration under the person's new id, naming who registered them (OOC-75)", async () => {
    const audit = new FakeAuditLogRepository();
    const usecase = new RegisterStudentUseCase(new FakeStudentRepository(), new FakeGuardianRepository(), audit);

    const result = await usecase.run({ actorId: "staff-1", student: A_STUDENT, guardian: null });

    expect(audit.appended).toEqual([
      expect.objectContaining({
        actorId: "staff-1",
        action: "student.registered",
        targetId: result.student.id,
        metadata: { withGuardian: false },
      }),
    ]);
  });
});
