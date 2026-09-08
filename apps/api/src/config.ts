import { z } from "zod";

const ConfigSchema = z.object({
  // environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3333").transform((val) => parseInt(val, 10)),
  HOST: z.string().default("0.0.0.0"),

  // database
  REDIS_URL: z.string().min(1),
  DATABASE_URL: z.string().min(1),

  // better-auth
  BETTER_AUTH_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  APP_PUBLIC_URL: z.string().min(1),

  /**
   * Shared secret apps/app presents on an `.internal()` route — the reads it
   * needs before it knows who is browsing (the feature-flag state, CLAUDE.md
   * §5). Optional so a fresh clone runs locally with nothing to invent;
   * required in production by the check below, where a missing secret would
   * otherwise mean the flag state silently falls back to the code defaults.
   */
  INTERNAL_API_TOKEN: z.string().min(24).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const config = ConfigSchema.parse(process.env);

  if (config.NODE_ENV === "production" && !config.INTERNAL_API_TOKEN) {
    throw new Error("INTERNAL_API_TOKEN is required in production (CLAUDE.md §5, feature flags).");
  }

  return config;
}
