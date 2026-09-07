// Better Auth's `user` row keeps one `name` field, not firstName/lastName —
// splitting it is a display-only, lossy convenience (same tension CLAUDE.md
// already flags for `students.full_name`, docs/ROADMAP.md Sessão 21a): a
// compound Peruvian name loses the split, never the data, since the column
// behind it is still the one `name` field. Shared by GetCurrentStaffRoute and
// ListStaffQuery — the one place this string gets parsed.
export function splitName(name: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}
