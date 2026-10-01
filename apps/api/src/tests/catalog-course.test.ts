import {
  Course,
  CourseNotFoundError,
  CreateCourseUseCase,
  UpdateCourseUseCase,
  type CreateCourseDTO,
} from "@ooc/domain";
import { ZodError } from "zod";
import { beforeEach, describe, expect, it } from "vitest";
import { FakeAuditLogRepository, FakeCourseRepository } from "./fakes/catalog.js";

/**
 * Opening and changing a course (OOC-36). Pure domain — fakes, no database.
 * What matters: the invariants live on the entity, every write leaves an audit
 * line, and an update reports only what actually changed.
 */

const ACTOR = "usr_admin";

const A_COURSE: CreateCourseDTO = {
  name: "Inglés Básico",
  language: "Inglés",
  level: "A1",
  summary: "Curso de inglés para principiantes.",
  minAge: 13,
  modules: 4,
  totalHours: 80,
  certificateRule: "automatic",
  allowsFreeze: true,
  allowsTransfer: false,
};

let courses: FakeCourseRepository;
let auditLog: FakeAuditLogRepository;

beforeEach(() => {
  courses = new FakeCourseRepository();
  auditLog = new FakeAuditLogRepository();
});

describe("CreateCourseUseCase", () => {
  it("creates the course and audits it", async () => {
    const created = await new CreateCourseUseCase(courses, auditLog).run({ actorId: ACTOR, course: A_COURSE });

    expect(created.name).toBe("Inglés Básico");
    expect(created.deletedAt).toBeNull();
    expect(courses.rows.get(created.id)).toBe(created);
    expect(auditLog.appended).toEqual([
      expect.objectContaining({ actorId: ACTOR, action: "catalog.course.created", targetId: created.id }),
    ]);
  });

  it("refuses a minimum age of zero", () => {
    expect(() => Course.create({ ...A_COURSE, minAge: 0 })).toThrow(ZodError);
  });

  it("refuses a blank summary", () => {
    expect(() => Course.create({ ...A_COURSE, summary: "   " })).toThrow(ZodError);
  });
});

describe("UpdateCourseUseCase", () => {
  it("applies the patch and audits the changed fields only", async () => {
    const course = await courses.create(Course.create(A_COURSE));

    const updated = await new UpdateCourseUseCase(courses, auditLog).run({
      actorId: ACTOR,
      id: course.id,
      patch: { minAge: 15, modules: 4 },
    });

    expect(updated.minAge).toBe(15);
    expect(auditLog.appended).toEqual([
      expect.objectContaining({
        action: "catalog.course.updated",
        targetId: course.id,
        metadata: { fields: ["minAge"] },
      }),
    ]);
  });

  it("writes nothing when nothing changed", async () => {
    const course = await courses.create(Course.create(A_COURSE));

    await new UpdateCourseUseCase(courses, auditLog).run({ actorId: ACTOR, id: course.id, patch: { modules: 4 } });

    expect(auditLog.appended).toEqual([]);
  });

  it("answers 404 for a course not on file", async () => {
    await expect(
      new UpdateCourseUseCase(courses, auditLog).run({ actorId: ACTOR, id: "018f2b5c-0000-7000-8000-0000000000ff", patch: { minAge: 15 } }),
    ).rejects.toBeInstanceOf(CourseNotFoundError);
  });
});
