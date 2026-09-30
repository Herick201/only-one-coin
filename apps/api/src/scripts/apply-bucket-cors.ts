import { GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { createS3Client } from "@/infra/storage/s3Client.js";

// The checkout POSTs the receipt straight from the browser to the bucket
// (apps/api/CLAUDE.md, "Upload"), which is a cross-origin request: without a
// CORS rule the object still lands, but the browser hides the response, the
// checkout reads it as a failure and drops a receipt that is already stored.
//
// The allowed origins are APP_PUBLIC_URLS — the same list better-auth trusts —
// so the bucket and the API never disagree about which domains are the app.
// Only POST: nothing in the browser ever reads or deletes from the bucket.
//
// Only the storage variables and APP_PUBLIC_URLS are read, not the full
// config: this runs from a laptop against a remote bucket, with no database
// or Redis in reach. Rerunning replaces the rule — it is idempotent.
const Env = z.object({
  AWS_ENDPOINT_URL_S3: z.string().min(1),
  AWS_REGION: z.string().default("auto"),
  BUCKET_NAME: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  APP_PUBLIC_URLS: z
    .string()
    .min(1)
    .transform((val) => val.split(",").map((url) => url.trim()).filter(Boolean)),
});

async function main() {
  const env = Env.parse(process.env);
  const s3 = createS3Client(env);

  await s3.send(
    new PutBucketCorsCommand({
      Bucket: env.BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: env.APP_PUBLIC_URLS,
            AllowedMethods: ["POST"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );

  const applied = await s3.send(new GetBucketCorsCommand({ Bucket: env.BUCKET_NAME }));
  console.log(`CORS on ${env.BUCKET_NAME}:`, JSON.stringify(applied.CORSRules, null, 2));
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
