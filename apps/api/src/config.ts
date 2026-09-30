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
    // Comma-separated origins apps/app is served from — student.* and
    // backoffice.* are two domains on the same Vercel deploy (apps/app/CLAUDE.md,
    // "Dois domínios, um deploy"), and better-auth's own origin check
    // (trustedOrigins, betterAuth.ts) needs every one of them listed or it
    // 403s any host not in the list.
    APP_PUBLIC_URLS: z
      .string()
      .min(1)
      .transform((val) => val.split(",").map((url) => url.trim()).filter(Boolean)),

    // storage (Tigris in production, any S3-compatible endpoint locally —
    // OOC-19). The comprovante image never reaches this process's own HTTP
    // function (CLAUDE.md §6); this is only the credential apps/api uses to
    // mint presigned upload targets and to HEAD/GET/PUT/DELETE objects from
    // the normalize worker.
    // Named exactly as `fly storage create` writes them into the app's
    // secrets, so provisioning the bucket is the whole setup.
    AWS_ENDPOINT_URL_S3: z.string().min(1),
    AWS_REGION: z.string().default("auto"),
    BUCKET_NAME: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    // Tigris (and AWS S3) resolve a bucket from the hostname; a local
    // S3-compatible server (LocalStack, compose.yml) needs the bucket in the path.
    STORAGE_FORCE_PATH_STYLE: z
      .string()
      .default("false")
      .transform((val) => val === "true"),
    // Receipt upload (CLAUDE.md §1, "comprovante" — a phone photo, not a
    // scan; old Android JPEGs run larger than a fresh HEIC). Env constant
    // rather than a `platform_settings` column: unlike the payment
    // tolerance or the checkout hold minutes, nothing in the business rules
    // asks for this to be staff-editable.
    RECEIPT_MAX_UPLOAD_BYTES: z
      .string()
      .default("15000000")
      .transform((val) => parseInt(val, 10)),

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
