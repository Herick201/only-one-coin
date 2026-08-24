import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { container } from "@/container.js";

const OpenClassGroupResponseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    courseId: z.string().uuid(),
    courseName: z.string(),
    academicPeriodName: z.string(),
    schedule: z.string(),
    startsOn: z.string(),
    capacity: z.number().int(),
    seatsTaken: z.number().int(),
    status: z.string(),
    planId: z.string().uuid(),
    planName: z.string(),
    planPriceId: z.string().uuid(),
    amountCents: z.number().int(),
  }),
);

// admin/coordinator only — same audience as the manual enrollment route this
// feeds (CLAUDE.md §1). No client input at all: this is a fixed, server-decided
// filter (status = enrolling AND seats left), so there's nothing to validate
// or bound beyond what the query itself already does.
export const listOpenClassGroupsRoute = RouteBuilder.get("/class-groups")
  .docs({
    tags: ["Catalog"],
    summary: "List class groups still open for enrollment",
    description: "Backs the manual enrollment form's class group picker.",
  })
  .roles("admin", "coordinator")
  .response(200, OpenClassGroupResponseSchema)
  .handler(async (_request, reply) => {
    const results = await container.queries.listOpenClassGroups.run();
    reply.status(200).send(results);
  });
