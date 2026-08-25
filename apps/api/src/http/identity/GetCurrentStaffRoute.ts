import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";

const StaffRoleSchema = z.enum(["admin", "coordinator", "teacher", "treasury", "mass_approver"]);

const GetCurrentStaffResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: StaffRoleSchema,
  teacherId: z.string().uuid().nullable(),
});

// Better Auth's `user` row keeps one `name` field, not firstName/lastName —
// splitting it here is a display-only, lossy convenience (same tension
// CLAUDE.md already flags for `students.full_name`, docs/ROADMAP.md Sessão
// 21a): a compound Peruvian name loses the split, never the data, since the
// column behind it is still the one `name` field.
function splitName(name: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

// The signed-in staff member's own identity, read from the session Better
// Auth already resolved (`request.currentUser`, populated by
// `authorizationPlugin` from the session cookie — never from client input,
// CLAUDE.md §8). No usecase behind this: it reshapes an already-authorized
// read for the client, it does not touch persistence or enforce a business
// rule.
//
// `teacherId` is always null for now — there is no `teachers` table yet
// (docs/ROADMAP.md Sessão 36). A `teacher` account still authenticates and
// reaches this route; the panel just cannot narrow it to "their own class
// groups" until that table exists.
export const getCurrentStaffRoute = RouteBuilder.get("/me")
  .docs({
    tags: ["Identity"],
    summary: "Get the signed-in staff member's own identity",
    description: "Backs the backoffice shell's role gating and account chip.",
  })
  .roles("admin", "coordinator", "teacher", "treasury", "mass_approver")
  .response(200, GetCurrentStaffResponseSchema)
  .handler(async (request, reply) => {
    // The authorization plugin's onRequest hook always sets this before a
    // non-public handler runs — narrowed here only so TypeScript knows it.
    const user = request.currentUser!;
    const { firstName, lastName } = splitName(user.name);

    reply.status(200).send({
      id: user.id,
      firstName,
      lastName,
      email: user.email,
      role: user.role as z.infer<typeof StaffRoleSchema>,
      teacherId: null,
    });
  });
