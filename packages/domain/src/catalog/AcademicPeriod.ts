import { v7 as uuid } from "uuid";
import { z } from "zod";
import { BASE_PROPS_KEYS, SoftDeletableModel, SoftDeletableModelPropsSchema } from "../shared/base/SoftDeletableModel.js";
import { InvalidDateRangeError } from "./errors.js";

export const AcademicPeriodPropsSchema = SoftDeletableModelPropsSchema.extend({
  name: z.string().trim().min(1),
  startsOn: z.coerce.date(),
  endsOn: z.coerce.date(),
});

export type AcademicPeriodProps = z.infer<typeof AcademicPeriodPropsSchema>;
export const CreateAcademicPeriodSchema = AcademicPeriodPropsSchema.omit(BASE_PROPS_KEYS);
export type CreateAcademicPeriodDTO = z.infer<typeof CreateAcademicPeriodSchema>;
export const UpdateAcademicPeriodSchema = CreateAcademicPeriodSchema.partial();
export type UpdateAcademicPeriodDTO = z.infer<typeof UpdateAcademicPeriodSchema>;

/** A sales period: its own courses on offer, dates and class groups (CLAUDE.md §1). */
export class AcademicPeriod extends SoftDeletableModel {
  public name: string;
  public startsOn: Date;
  public endsOn: Date;

  constructor(props: AcademicPeriodProps) {
    super(props);
    this.name = props.name;
    this.startsOn = props.startsOn;
    this.endsOn = props.endsOn;
  }

  static create(dto: CreateAcademicPeriodDTO): AcademicPeriod {
    const period = new AcademicPeriod(AcademicPeriodPropsSchema.parse({ ...dto, id: uuid() }));
    period.assertRange();
    return period;
  }

  update(patch: UpdateAcademicPeriodDTO): (keyof UpdateAcademicPeriodDTO)[] {
    const valid = UpdateAcademicPeriodSchema.parse(patch);
    const changed: (keyof UpdateAcademicPeriodDTO)[] = [];
    if (valid.name !== undefined && valid.name !== this.name) {
      this.name = valid.name;
      changed.push("name");
    }
    if (valid.startsOn !== undefined && valid.startsOn.getTime() !== this.startsOn.getTime()) {
      this.startsOn = valid.startsOn;
      changed.push("startsOn");
    }
    if (valid.endsOn !== undefined && valid.endsOn.getTime() !== this.endsOn.getTime()) {
      this.endsOn = valid.endsOn;
      changed.push("endsOn");
    }
    this.assertRange();
    if (changed.length > 0) this.touch();
    return changed;
  }

  private assertRange(): void {
    if (this.startsOn.getTime() >= this.endsOn.getTime()) throw new InvalidDateRangeError();
  }
}
