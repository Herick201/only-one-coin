import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import type { IReceiptStorage, PresignedReceiptUpload, StoredObjectHead } from "@ooc/domain";

/** How long the presigned POST is good for — long enough for a slow mobile
 * upload, short enough that a leaked URL is not a standing door. */
const UPLOAD_TARGET_EXPIRY_SECONDS = 5 * 60;

/**
 * The `IReceiptStorage` port, backed by an S3-compatible bucket (Tigris in
 * every real environment, LocalStack locally — compose.yml). A presigned **POST** rather than a
 * PUT URL — a POST policy is the only place the bucket itself enforces
 * `content-length-range`, which is what lets the size cap hold without a
 * single byte of the file passing through `apps/api`'s own function
 * (CLAUDE.md §6).
 */
export class TigrisReceiptStorage implements IReceiptStorage {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
  ) {}

  async createUploadTarget(params: {
    objectKey: string;
    contentType: string;
    maxBytes: number;
  }): Promise<PresignedReceiptUpload> {
    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: params.objectKey,
      Expires: UPLOAD_TARGET_EXPIRY_SECONDS,
      Conditions: [
        ["content-length-range", 0, params.maxBytes],
        { "Content-Type": params.contentType },
      ],
      Fields: {
        "Content-Type": params.contentType,
      },
    });

    return { url, fields };
  }

  async headObject(objectKey: string): Promise<StoredObjectHead | null> {
    try {
      const result = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }));
      return { contentType: result.ContentType ?? null, byteSize: result.ContentLength ?? 0 };
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }
}

function isNotFound(error: unknown): boolean {
  const name = (error as { name?: unknown }).name;
  return name === "NotFound" || name === "NoSuchKey";
}
