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
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
