// TODO: switch to native crypto.randomUUIDv7() once engines.node requires >=26 (LTS ~out/2026)
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { BaseModel } from "../shared/base/BaseModel.js";

export const PaymentRailSchema = z.enum(["yape", "plin", "bcp", "interbank"]);
export const PaymentMethodSchema = z.union([PaymentRailSchema, z.literal("other")]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentStatusSchema = z.enum(["pending", "under_review", "approved", "rejected"]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentPropsSchema = z
  .object({
    id: z.string().uuid(),
    enrollmentId: z.string().uuid(),
    idempotencyKey: z.string().min(1),
    status: PaymentStatusSchema,
    method: PaymentMethodSchema,
    // Required only when method is 'other' — the free text IS the label
    // (CLAUDE.md §4 glossary).
    methodDetail: z.string().min(1).nullable(),
    amountCents: z.number().int().positive(),
    operationNumber: z.string().min(1).nullable(),
  })
  .refine((props) => props.method !== "other" || props.methodDetail !== null, {
    message: "methodDetail is required when method is 'other'",
    path: ["methodDetail"],
  });

export type PaymentProps = z.infer<typeof PaymentPropsSchema>;

export class Payment extends BaseModel {
  public enrollmentId: string;
  public idempotencyKey: string;
  public status: PaymentStatus;
  public method: PaymentMethod;
  public methodDetail: string | null;
  public amountCents: number;
  public operationNumber: string | null;

  constructor(props: PaymentProps) {
    super(props.id);
    this.enrollmentId = props.enrollmentId;
    this.idempotencyKey = props.idempotencyKey;
    this.status = props.status;
    this.method = props.method;
    this.methodDetail = props.methodDetail;
    this.amountCents = props.amountCents;
    this.operationNumber = props.operationNumber;
  }

  /**
   * Manual backoffice enrollment (CLAUDE.md §1, lock (d)): the payment never
   * starts approved. With a receipt attached it enters the same review
   * ladder every other receipt does (`under_review`); without one it is
   * still `pending` on the student sending it — mirroring
   * apps/app/.../new-enrollment-form.tsx's own submit logic.
   */
  static createManual(params: {
    enrollmentId: string;
    method: PaymentMethod;
    methodDetail: string | null;
    amountCents: number;
    operationNumber: string;
    receiptAttached: boolean;
  }): Payment {
    const result = PaymentPropsSchema.safeParse({
      id: uuid(),
      enrollmentId: params.enrollmentId,
      idempotencyKey: uuid(),
      status: params.receiptAttached ? "under_review" : "pending",
      method: params.method,
      methodDetail: params.methodDetail,
      amountCents: params.amountCents,
      operationNumber: params.operationNumber,
    });

    if (!result.success) {
      throw new Error("Invalid data");
    }

    return new Payment(result.data);
  }
}
