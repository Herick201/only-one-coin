import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { Enrollment } from "./Enrollment.js";
import type { IEnrollmentRepository } from "./EnrollmentRepository.js";
import { Payment, type PaymentMethod } from "./Payment.js";
import { PlanPriceNotFoundError } from "./errors.js";
import type { IPlanPriceLookup } from "./PlanPriceLookup.js";

export interface CreateManualEnrollmentInput {
  studentId: string;
  classGroupId: string;
  planId: string;
  method: PaymentMethod;
  methodDetail: string | null;
  operationNumber: string;
  receiptAttached: boolean;
}

export interface CreateManualEnrollmentOutput {
  enrollment: Enrollment;
  payment: Payment;
}

/**
 * The manual backoffice exception (CLAUDE.md §1): staff opens an enrollment
 * over a student already on file, for a sale that closed on WhatsApp and
 * never reached the public form. Four locks, all enforced here:
 * (a) studentId must already exist — enforced by the FK, this usecase never
 *     creates a student; (b) the price is resolved server-side from the
 *     plan in force, never accepted from the client; (c) the seat is always
 *     reserved, never confirmed (Enrollment.createManual); (d) the payment
 *     never starts approved (Payment.createManual).
 */
export class CreateManualEnrollmentUseCase extends BaseUseCase<
  CreateManualEnrollmentInput,
  CreateManualEnrollmentOutput
> {
  constructor(
    private readonly enrollmentRepository: IEnrollmentRepository,
    private readonly planPriceLookup: IPlanPriceLookup,
  ) {
    super();
  }

  async run(input: CreateManualEnrollmentInput): Promise<CreateManualEnrollmentOutput> {
    const price = await this.planPriceLookup.findCurrentPrice(input.planId);

    if (!price) {
      throw new PlanPriceNotFoundError();
    }

    const enrollment = Enrollment.createManual({
      studentId: input.studentId,
      classGroupId: input.classGroupId,
      planPriceId: price.id,
    });

    const payment = Payment.createManual({
      enrollmentId: enrollment.id,
      method: input.method,
      methodDetail: input.methodDetail,
      amountCents: price.amountCents,
      operationNumber: input.operationNumber,
      receiptAttached: input.receiptAttached,
    });

    return this.enrollmentRepository.createWithPayment({ enrollment, payment });
  }
}
