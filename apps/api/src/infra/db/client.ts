import * as schema from "@ooc/db";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Config } from "@/config.js";

export type Db = ReturnType<typeof createDb>;

// Only apps/api (and workers) hold a Postgres credential (CLAUDE.md §8) —
// apps/app never imports this. Same DATABASE_URL as packages/db's own
// migrations (packages/db/README.md), consumed here purely as a query
// client — @ooc/db/src/schema.ts is the single source of truth for both.
export function createDb(config: Config) {
  const pool = new Pool({ connectionString: config.DATABASE_URL });
  return drizzle(pool, { schema, casing: "snake_case" });
}
