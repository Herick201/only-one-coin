/**
 * What a client PUTs the file straight to — a presigned POST, not a PUT URL,
 * because a POST policy is the only S3-compatible mechanism that lets the
 * bucket itself refuse an oversized body (`content-length-range`) without the
 * file ever reaching `apps/api`'s own function (CLAUDE.md §6, "nunca passa
 * pela função da aplicação"). `fields` are posted alongside the file as
 * ordinary form fields, in the order the provider returns them.
 */
export interface PresignedReceiptUpload {
  url: string;
  fields: Record<string, string>;
}

export interface StoredObjectHead {
  contentType: string | null;
  byteSize: number;
}

/**
 * The bucket, abstracted to exactly what the enrollment context needs from
 * it — minting an upload target and reading back what actually landed.
 * Nothing here streams a body: `apps/api`'s implementation talks S3/Tigris,
 * this interface only ever exchanges keys and metadata.
 */
export interface IReceiptStorage {
  /** Mints a one-time upload target scoped to `objectKey`, capped at
   * `maxBytes` by the provider's own policy — never trusted from the
   * client. */
  createUploadTarget(params: {
    objectKey: string;
    contentType: string;
    maxBytes: number;
  }): Promise<PresignedReceiptUpload>;

  /** A metadata-only read (HEAD) — confirms the object exists and reports
   * what the client actually sent, never its bytes. `null` when nothing has
   * landed at that key yet. */
  headObject(objectKey: string): Promise<StoredObjectHead | null>;
}
