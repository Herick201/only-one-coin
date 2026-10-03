// TODO: switch to native crypto.randomUUIDv7() once engines.node requires >=26 (LTS ~out/2026)
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { InvalidFieldsError } from "../shared/base/errors/InvalidFieldsError.js";
import { SoftDeletableModel, SoftDeletableModelPropsSchema } from "../shared/base/SoftDeletableModel.js";
import {
  EmailField,
  NationalIdField,
  NationalIdTypeSchema,
  PersonNameField,
  PhoneField,
  refineNationalId,
  toFieldErrors,
} from "./fields.js";

export const GuardianRelationshipSchema = z.enum(["mother", "father", "legal_guardian"]);
export type GuardianRelationship = z.infer<typeof GuardianRelationshipSchema>;

/** What a stored record looks like — loose, see `StudentPropsSchema`. */
export const GuardianPropsSchema = SoftDeletableModelPropsSchema.extend({
  studentId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  relationship: GuardianRelationshipSchema,
  nationalIdType: NationalIdTypeSchema,
  nationalId: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

/**
 * What a new or rewritten guardian must satisfy. Same document and phone rules
 * as the student; the address can be any provider — Classroom belongs to the
 * student. Routes that drop `studentId` or add the consent checkbox extend
 * `GuardianFieldsSchema` and re-apply `refineNationalId`.
 */
export const GuardianFieldsSchema = z.object({
  studentId: z.string().uuid(),
  firstName: PersonNameField,
  lastName: PersonNameField,
  relationship: GuardianRelationshipSchema,
  nationalIdType: NationalIdTypeSchema,
  nationalId: NationalIdField,
  email: EmailField,
  phone: PhoneField,
});

export const CreateGuardianSchema = GuardianFieldsSchema.superRefine(refineNationalId);

export type GuardianProps = z.infer<typeof GuardianPropsSchema>;
export type CreateGuardianDTO = z.infer<typeof CreateGuardianSchema>;

/**
 * Consent (Ley 29733) is deliberately not a field here — it is a separate,
 * append-only record accepted by the guardian themself, with their own
 * timestamp/version/IP (CLAUDE.md §1, §8). A Guardian is created with
 * consent pending; nothing on this entity ever claims it was accepted.
 */
export class Guardian extends SoftDeletableModel {
  public studentId: string;
  public firstName: string;
  public lastName: string;
  public relationship: GuardianRelationship;
  public nationalIdType: z.infer<typeof NationalIdTypeSchema>;
  public nationalId: string;
  public email: string;
  public phone: string;

  constructor(props: GuardianProps) {
    super(props);
    this.studentId = props.studentId;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.relationship = props.relationship;
    this.nationalIdType = props.nationalIdType;
    this.nationalId = props.nationalId;
    this.email = props.email;
    this.phone = props.phone;
  }

  static create(dto: CreateGuardianDTO): Guardian {
    const result = CreateGuardianSchema.safeParse(dto);

    if (!result.success) {
      throw new InvalidFieldsError(toFieldErrors(result.error.issues, "guardian"));
    }

    return new Guardian({
      id: uuid(),
      ...result.data,
    });
  }
}
