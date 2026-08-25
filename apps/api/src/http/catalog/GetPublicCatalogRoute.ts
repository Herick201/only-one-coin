import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { container } from "@/container.js";

const GetPublicCatalogResponseSchema = z.object({
  languages: z.array(z.object({ id: z.string(), name: z.string() })),
  courses: z.array(
    z.object({
      id: z.string().uuid(),
      languageId: z.string(),
      name: z.string(),
      level: z.string(),
      minAge: z.number().int(),
      modules: z.number().int(),
      totalHours: z.number().int(),
    }),
  ),
  plans: z.array(
    z.object({
      id: z.string().uuid(),
      courseId: z.string().uuid(),
      name: z.string(),
      planPriceId: z.string().uuid(),
      amountCents: z.number().int(),
      currency: z.literal("PEN"),
    }),
  ),
  classGroups: z.array(
    z.object({
      id: z.string().uuid(),
      courseId: z.string().uuid(),
      code: z.string(),
      teacherName: z.string(),
      slots: z.array(
        z.object({
          weekday: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
          startTime: z.string(),
          endTime: z.string(),
        }),
      ),
      startDate: z.string(),
      endDate: z.string(),
      capacity: z.number().int(),
      seatsTaken: z.number().int(),
    }),
  ),
  // Static institutional config, not a query — no `payment_accounts` or
  // `settings` table exists yet (CLAUDE.md §5 wants both backoffice-
  // configurable eventually; this is the honest interim). Kept in the route
  // rather than the frontend so swapping it for a real table later touches
  // one file, same principle as everything else in this pipeline.
  accounts: z.array(
    z.object({
      method: z.enum(["yape", "plin", "bcp", "interbank"]),
      holder: z.string(),
      number: z.string(),
      interbankCode: z.string().nullable(),
      hasQr: z.boolean(),
    }),
  ),
  settings: z.object({
    holdMinutes: z.number().int(),
    reservationDays: z.number().int(),
    maxReceiptBytes: z.number().int(),
    consentVersion: z.string(),
  }),
});

const PROVISIONAL_ACCOUNTS = [
  { method: "yape" as const, holder: "Asociación Only One Coin Perú", number: "999 999 999", interbankCode: null, hasQr: true },
  { method: "bcp" as const, holder: "Asociación Only One Coin Perú", number: "191-9999999-0-99", interbankCode: "00219199999999099", hasQr: false },
];

// This reduced slice's hold is still client-side only (docs/ROADMAP.md
// Sessão 24 not built) — holdMinutes/reservationDays travel with the
// catalog anyway so the client never hardcodes them, even while nothing
// server-side enforces the first one yet.
const PROVISIONAL_SETTINGS = {
  holdMinutes: 15,
  reservationDays: 5,
  maxReceiptBytes: 8 * 1024 * 1024,
  consentVersion: "v1",
};

export const getPublicCatalogRoute = RouteBuilder.get("/catalog")
  .docs({
    tags: ["Catalog"],
    summary: "Public catalog for the enrollment checkout",
    description: "Languages, courses, plans, open class groups and payment accounts — no session required.",
  })
  .public()
  .response(200, GetPublicCatalogResponseSchema)
  .handler(async (_request, reply) => {
    const catalog = await container.queries.getPublicCatalog.run();

    const languages = [...new Map(catalog.courses.map((course) => [course.language, course.language])).keys()].map(
      (language) => ({ id: language, name: language }),
    );

    reply.status(200).send({
      languages,
      courses: catalog.courses.map((course) => ({
        id: course.id,
        languageId: course.language,
        name: course.name,
        level: course.level,
        minAge: course.minAge,
        modules: course.modules,
        totalHours: course.totalHours,
      })),
      plans: catalog.plans.map((plan) => ({ ...plan, currency: "PEN" as const })),
      classGroups: catalog.classGroups.map((group) => ({
        id: group.id,
        courseId: group.courseId,
        code: group.code,
        teacherName: group.teacherName,
        slots: group.slots as z.infer<typeof GetPublicCatalogResponseSchema>["classGroups"][number]["slots"],
        startDate: group.startsOn.toISOString(),
        endDate: group.endsOn.toISOString(),
        capacity: group.capacity,
        seatsTaken: group.seatsTaken,
      })),
      accounts: PROVISIONAL_ACCOUNTS,
      settings: PROVISIONAL_SETTINGS,
    });
  });
