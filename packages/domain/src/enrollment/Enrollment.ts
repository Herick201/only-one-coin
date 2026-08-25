// TODO: switch to native crypto.randomUUIDv7() once engines.node requires >=26 (LTS ~out/2026)
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { BaseModel } from "../shared/base/BaseModel.js";

export const SeatStatusSchema = z.enum(["reserved", "confirmed", "released"]);
export type SeatStatus = z.infer<typeof SeatStatusSchema>;

export const EnrollmentPropsSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  classGroupId: z.string().uuid(),
  // Frozen at creation — the plan price in force at the moment of
  // enrollment, never re-resolved afterwards (CLAUDE.md §5).
  planPriceId: z.string().uuid(),
  seatStatus: SeatStatusSchema,
});

export type EnrollmentProps = z.infer<typeof EnrollmentPropsSchema>;

export class Enrollment extends BaseModel {
  public studentId: string;
  public classGroupId: string;
  public planPriceId: string;
  public seatStatus: SeatStatus;

  constructor(props: EnrollmentProps) {
    super(props.id);
    this.studentId = props.studentId;
    this.classGroupId = props.classGroupId;
    this.planPriceId = props.planPriceId;
    this.seatStatus = props.seatStatus;
  }

  /**
   * Manual backoffice enrollment (CLAUDE.md §1, lock (c)): the seat is
   * always reserved, never confirmed — confirmation only follows an
   * approved payment, and whoever opens the enrollment does not settle its
   * money.
   */
  static createManual(params: { studentId: string; classGroupId: string; planPriceId: string }): Enrollment {
    return new Enrollment({
      id: uuid(),
      studentId: params.studentId,
      classGroupId: params.classGroupId,
      planPriceId: params.planPriceId,
      seatStatus: "reserved",
    });
  }
}
