import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import {
  RECEIPT_EXTRACTION_TIER_PRIMARY,
  ReceiptExtractionError,
  type IReceiptExtractor,
  type ReceiptExtraction,
  type ReceiptExtractionFailureReason,
} from "./ReceiptExtraction.js";
import type { IReceiptExtractionRepository, IReceiptImageReader } from "./ReceiptExtractionRepository.js";

/** The normalize worker always re-encodes to JPEG (normalizeReceiptImage). */
const PROCESSED_RECEIPT_CONTENT_TYPE = "image/jpeg";

export interface ExtractReceiptInput {
  receiptUploadId: string;
}

export interface ExtractReceiptOutput {
  /** `null` when there was nothing to read (see
   * `IReceiptExtractionRepository.findSubject`). */
  extraction: ReceiptExtraction | null;
}

export interface RecordReceiptExtractionFailureInput {
  receiptUploadId: string;
  error: unknown;
}

/**
 * Level 1 of the OCR ladder (apps/api/CLAUDE.md, OOC-20), run by the
 * `receipt-extract` worker once a receipt is normalized and attached to a
 * payment. Reads the processed image, asks the primary model for the five
 * fields, and records the reading with the model's name, version and
 * per-field confidence.
 *
 * It decides nothing: no status change, no comparison with the plan price —
 * that is the validation step (ROADMAP Sessão 27), and escalating to
 * another model on low confidence is level 2 (Sessão 29). A failing call
 * throws so the worker retries it (level 1r); once the attempts run out the
 * worker calls `recordFailure`.
 */
export class ExtractReceiptUseCase extends BaseUseCase<ExtractReceiptInput, ExtractReceiptOutput> {
  constructor(
    private readonly repository: IReceiptExtractionRepository,
    private readonly images: IReceiptImageReader,
    private readonly extractor: IReceiptExtractor,
  ) {
    super();
  }

  async run(input: ExtractReceiptInput): Promise<ExtractReceiptOutput> {
    const tier = RECEIPT_EXTRACTION_TIER_PRIMARY;
    const subject = await this.repository.findSubject(input.receiptUploadId, tier);
    if (!subject) {
      return { extraction: null };
    }

    const bytes = await this.images.read(subject.processedObjectKey);
    const extraction = await this.extractor.extract({ bytes, contentType: PROCESSED_RECEIPT_CONTENT_TYPE });
    await this.repository.recordExtraction({ subject, tier, extraction });

    return { extraction };
  }

  async recordFailure(input: RecordReceiptExtractionFailureInput): Promise<ReceiptExtractionFailureReason | null> {
    const tier = RECEIPT_EXTRACTION_TIER_PRIMARY;
    const subject = await this.repository.findSubject(input.receiptUploadId, tier);
    if (!subject) {
      return null;
    }

    const reason = input.error instanceof ReceiptExtractionError ? input.error.reason : "unexpected_error";
    await this.repository.recordFailure({ subject, tier, modelName: this.extractor.modelName, reason });
    return reason;
  }
}
