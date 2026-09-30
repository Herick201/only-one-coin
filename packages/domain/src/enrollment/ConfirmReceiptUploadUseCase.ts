import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { ReceiptNotUploadedError, ReceiptUploadNotFoundError } from "./errors.js";
import type { IReceiptStorage } from "./ReceiptStorage.js";
import type { IReceiptUploadRepository } from "./ReceiptUploadRepository.js";

export interface ConfirmReceiptUploadInput {
  receiptUploadId: string;
  /** The hold the checkout still holds — compared against the row's own,
   * never trusted as sufficient on its own (anti-IDOR). */
  seatHoldId: string;
}

export interface ConfirmReceiptUploadOutput {
  receiptUploadId: string;
}

/**
 * The checkout's PUT to the bucket finished — this is the metadata-only HEAD
 * that confirms the object actually landed before the submit is allowed to
 * name it. Still never touches a byte of the file itself (CLAUDE.md §6):
 * `IReceiptStorage.headObject` reads size and content-type, nothing else.
 *
 * Idempotent: a confirm that arrives twice finds the row already `uploaded`
 * and returns the same id without a second HEAD.
 */
export class ConfirmReceiptUploadUseCase extends BaseUseCase<ConfirmReceiptUploadInput, ConfirmReceiptUploadOutput> {
  constructor(
    private readonly receiptUploads: IReceiptUploadRepository,
    private readonly storage: IReceiptStorage,
  ) {
    super();
  }

  async run(input: ConfirmReceiptUploadInput): Promise<ConfirmReceiptUploadOutput> {
    const row = await this.receiptUploads.findById(input.receiptUploadId);
    if (!row || row.seatHoldId !== input.seatHoldId) {
      throw new ReceiptUploadNotFoundError();
    }

    if (row.status !== "pending") {
      // Already confirmed (or past confirming) — a retry is a no-op.
      return { receiptUploadId: row.id };
    }

    const head = await this.storage.headObject(row.objectKey);
    if (!head) {
      throw new ReceiptNotUploadedError();
    }

    await this.receiptUploads.markUploaded(row.id, {
      contentType: head.contentType ?? "application/octet-stream",
      byteSize: head.byteSize,
    });

    return { receiptUploadId: row.id };
  }
}
