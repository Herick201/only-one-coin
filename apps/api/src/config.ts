import { z } from "zod";

const ConfigSchema = z
  .object({
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

    // e-mail (Brevo, behind NotificationProvider — CLAUDE.md §3). Without a
    // key, e-mails are rendered and logged, never sent — optional even in
    // production, so a deploy never goes down over a missing e-mail secret
    // (index.ts warns at boot instead).
    BREVO_API_KEY: z.string().min(1).optional(),
    // A sender Brevo has verified for this account.
    EMAIL_SENDER_ADDRESS: z.string().email().optional(),
    EMAIL_SENDER_NAME: z.string().min(1).default("Only One Coin"),
    // Outside production, the only recipients that ever get a real e-mail:
    // comma-separated addresses and/or "@domain" entries. Empty = nobody.
    EMAIL_ALLOWLIST: z
      .string()
      .default("")
      .transform((val) =>
        val
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
  })
  .superRefine((config, ctx) => {
    if (config.BREVO_API_KEY && !config.EMAIL_SENDER_ADDRESS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_SENDER_ADDRESS"],
        message: "is required when BREVO_API_KEY is set",
      });
    }
  });

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
