import { z } from "zod";
import type { AuditLogEntry } from "../identity/ports/IAuditLogRepository.js";
import type { EmailNotification } from "../notification/EmailNotification.js";
import type { SeatStatus } from "./Enrollment.js";
import type { PaymentStatus } from "./Payment.js";

export const PaymentRejectionReasonSchema = z.enum(["amount_mismatch", "illegible", "duplicate", "not_a_receipt", "other"]);
export type PaymentRejectionReason = z.infer<typeof PaymentRejectionReasonSchema>;

export type PaymentDecision = { kind: "approve" } | { kind: "reject"; reason: PaymentRejectionReason; note: string };

export interface PaymentToSettle {
  paymentId: string;
  enrollmentId: string;
  studentId: string;
  classGroupId: string;
  status: PaymentStatus;
  seatStatus: SeatStatus;
}

export interface IPaymentSettlementRepository {
  findForSettlement(paymentId: string): Promise<PaymentToSettle | null>;
  /**
   * One short transaction: the payment moves only out of `pending`/`under_review`
   * (zero rows → `PaymentAlreadySettledError`); approving confirms a reserved
   * seat and refuses a released one (`PaymentSeatReleasedError`); rejecting
   * releases a reserved seat and gives it back to the class group; a confirmed
   * seat (a monthly module) is left alone either way. Outbox and audit entry in
   * the same transaction.
   */
  settle(params: {
    paymentId: string;
    enrollmentId: string;
    classGroupId: string;
    to: "approved" | "rejected";
    notifications: EmailNotification[];
    audit: AuditLogEntry;
  }): Promise<{ seatStatus: SeatStatus }>;
}
