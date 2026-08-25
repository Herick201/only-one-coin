import { academicPeriods, classGroups, courses, planPrices, plans } from "@ooc/db";
import { eq } from "drizzle-orm";
import { container } from "@/container.js";

const COURSE_NAME = "Inglés Básico A1 (seed)";

// Local/dev only — puts one open class group in the database so the manual
// enrollment picker (backoffice/enrollments, CLAUDE.md §1) and the public
// catalog route have something to list. Guarded by course name so rerunning
// doesn't pile up duplicates; never point this at staging or production.
async function main() {
  const [existingCourse] = await container.db.select().from(courses).where(eq(courses.name, COURSE_NAME));

  if (existingCourse) {
    console.log(`${COURSE_NAME} already seeded, skipping`);
    process.exit(0);
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 3);

  const classStart = new Date(now);
  classStart.setDate(classStart.getDate() + 7);
  const classEnd = new Date(classStart);
  classEnd.setMonth(classEnd.getMonth() + 2);

  const [period] = await container.db
    .insert(academicPeriods)
    .values({ name: "Ciclo de prueba (seed)", startsOn: now, endsOn: periodEnd })
    .returning();

  const [course] = await container.db
    .insert(courses)
    .values({ name: COURSE_NAME, language: "Inglés", minAge: 12, level: "A1", modules: 4, totalHours: 80 })
    .returning();

  const [plan] = await container.db
    .insert(plans)
    .values({ courseId: course!.id, name: "Plan completo (seed)" })
    .returning();

  const [price] = await container.db
    .insert(planPrices)
    .values({ planId: plan!.id, amountCents: 6990, validFrom: now })
    .returning();

  const [classGroup] = await container.db
    .insert(classGroups)
    .values({
      courseId: course!.id,
      academicPeriodId: period!.id,
      schedule: "Mar/Jue 18:00-20:00",
      slots: [
        { weekday: "tue", startTime: "18:00", endTime: "20:00" },
        { weekday: "thu", startTime: "18:00", endTime: "20:00" },
      ],
      code: "A1-SEED-01",
      teacherName: "Profesor de prueba (seed)",
      startsOn: classStart,
      endsOn: classEnd,
      capacity: 20,
      status: "enrolling",
    })
    .returning();

  console.log(`Seeded course "${course!.name}", plan "${plan!.name}" (S/${(price!.amountCents / 100).toFixed(2)}), class group ${classGroup!.id}`);
  process.exit(0);
}

main();
