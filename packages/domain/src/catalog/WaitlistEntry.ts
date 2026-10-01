import { v7 as uuid } from "uuid";
import { z } from "zod";
import { BaseModel, BaseModelPropsSchema } from "../shared/base/BaseModel.js";
import { WaitlistEntryClosedError } from "./errors.js";

export const WaitlistLeaveReasonSchema = z.enum(["enrolled", "withdrawn", "removed_by_staff"]);
export type WaitlistLeaveReason = z.infer<typeof WaitlistLeaveReasonSchema>;
/** 'enrolled' is written by the manual enrollment itself, never chosen by staff. */
export const StaffWaitlistLeaveReasonSchema = z.enum(["withdrawn", "removed_by_staff"]);
export type StaffWaitlistLeaveReason = z.infer<typeof StaffWaitlistLeaveReasonSchema>;

export const WaitlistEntryPropsSchema = BaseModelPropsSchema.extend({
  classGroupId: z.string().uuid(),
  studentId: z.string().uuid(),
  leftAt: z.coerce.date().nullable(),
  leftReason: WaitlistLeaveReasonSchema.nullable(),
});
export type WaitlistEntryProps = z.infer<typeof WaitlistEntryPropsSchema>;

/**
 * A place in a full class group's queue (OOC-35, backoffice-only). Leaving is
 * marked, never deleted — who waited and why they stopped is the record.
 */
export class WaitlistEntry extends BaseModel {
  public readonly classGroupId: string;
  public readonly studentId: string;
  public leftAt: Date | null;
  public leftReason: WaitlistLeaveReason | null;

  constructor(props: WaitlistEntryProps) {
    super(props);
    this.classGroupId = props.classGroupId;
    this.studentId = props.studentId;
    this.leftAt = props.leftAt;
    this.leftReason = props.leftReason;
  }

  static join(dto: { classGroupId: string; studentId: string }): WaitlistEntry {
    return new WaitlistEntry(WaitlistEntryPropsSchema.parse({ ...dto, id: uuid(), leftAt: null, leftReason: null }));
  }

  leave(reason: WaitlistLeaveReason, at: Date = new Date()): void {
    if (this.leftAt !== null) throw new WaitlistEntryClosedError();
    this.leftAt = at;
    this.leftReason = reason;
    this.touch(at);
  }
}
