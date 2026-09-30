import { S3Client } from "@aws-sdk/client-s3";
import type { Config } from "@/config.js";

/**
 * One client, shared by the presign/HEAD calls (`TigrisReceiptStorage`, the
 * `IReceiptStorage` port's implementation) and the normalize worker's own
 * GET/PUT/DELETE (`ReceiptObjectStore`) — same credential, same endpoint.
 *
 * `forcePathStyle` is the one thing that differs between environments:
 * Tigris (production, staging) resolves the bucket from the hostname; a
 * local S3-compatible server (LocalStack, `STORAGE_FORCE_PATH_STYLE=true`) needs
 * it in the path instead.
 */
export type S3Config = Pick<
  Config,
  "AWS_ENDPOINT_URL_S3" | "AWS_REGION" | "STORAGE_FORCE_PATH_STYLE" | "AWS_ACCESS_KEY_ID" | "AWS_SECRET_ACCESS_KEY"
>;

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    endpoint: config.AWS_ENDPOINT_URL_S3,
    region: config.AWS_REGION,
    forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
  });
}
