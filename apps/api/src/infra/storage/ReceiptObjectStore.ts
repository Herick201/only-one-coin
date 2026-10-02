import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * The raw bucket operations the normalize worker needs and nothing else
 * touches — downloading the uploaded photo, storing the processed version,
 * deleting the raw one once it does. Not the `IReceiptStorage` domain port:
 * that port is scoped to what the two HTTP-facing usecases need (mint a
 * target, HEAD it); this is infra the worker alone calls, the same way
 * `deliverOutboxEmail` calls `NotificationProvider` directly without a
 * usecase wrapper.
 */
export class ReceiptObjectStore {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
  ) {}

  async getObject(key: string): Promise<Buffer> {
    const result = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const body = result.Body;
    if (!body) {
      throw new Error(`Object ${key} has no body`);
    }
    const chunks: Buffer[] = [];
    // @ts-expect-error - Body is a Node.js Readable at runtime under the Node SDK
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }
    return Buffer.concat(chunks);
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** A GET URL that dies in `expiresInSeconds` - the only way a person sees a
   * receipt (CLAUDE.md §8: 5 minutes, scoped, access logged by the caller). */
  async createReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresInSeconds });
  }
}
