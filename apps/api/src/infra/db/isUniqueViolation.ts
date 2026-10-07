const PG_UNIQUE_VIOLATION = "23505";

/**
 * Whether `error` is Postgres refusing a duplicate (23505) — optionally on one
 * named constraint. drizzle wraps the driver error, so the pg code (and the
 * constraint name) can sit on `cause`.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  for (let current: unknown = error, depth = 0; current && depth < 4; depth += 1) {
    if (typeof current === "object") {
      const { code, constraint: violated } = current as { code?: unknown; constraint?: unknown };
      if (code === PG_UNIQUE_VIOLATION) return constraint === undefined || violated === constraint;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
