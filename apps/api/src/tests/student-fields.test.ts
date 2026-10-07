import {
  CreateGuardianSchema,
  CreateStudentSchema,
  EmailField,
  gmailUsernameIssue,
  InvalidFieldsError,
  issueOf,
  nationalIdIssue,
  normalizeNationalId,
  OperationNumberField,
  PersonNameField,
  PhoneField,
  suggestEmailDomain,
  Student,
  type NationalIdType,
} from "@ooc/domain";
import { describe, expect, it } from "vitest";

/**
 * The person-record field rules (OOC-64): one copy in @ooc/domain, read by the
 * API through the entity schemas and by the checkout and the backoffice through
 * `@ooc/domain/fields`. Each rule answers with a code, never a sentence.
 */

const A_STUDENT = {
  firstName: "Rosa",
  lastName: "Quispe",
  nationalIdType: "DNI" as NationalIdType,
  nationalId: "70123456",
  email: "rosa.quispe@gmail.com",
  phone: "987654321",
  birthDate: "2010-04-12",
  country: "PE",
  region: "Lima",
  city: "Chorrillos",
};

function issuesOf(input: unknown) {
  const result = CreateStudentSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => [issue.path.join("."), issue.message]);
}

describe("normalization", () => {
  it("folds a document's separators and case away, so one DNI is one record", () => {
    expect(normalizeNationalId(" 12.345.678 ")).toBe("12345678");
    expect(normalizeNationalId("12-345-678")).toBe("12345678");
    expect(normalizeNationalId("ab 123-4567")).toBe("AB1234567");
  });

  it("writes the normalized values, not what was typed", () => {
    const parsed = CreateStudentSchema.parse({
      ...A_STUDENT,
      firstName: "  Rosa   María ",
      nationalId: "70.123.456",
      email: "  Rosa.Quispe@Gmail.COM ",
      city: " Chorrillos ",
      country: "pe",
    });

    expect(parsed.firstName).toBe("Rosa María");
    expect(parsed.nationalId).toBe("70123456");
    expect(parsed.email).toBe("rosa.quispe@gmail.com");
    expect(parsed.city).toBe("Chorrillos");
    expect(parsed.country).toBe("PE");
  });
});

describe("document format by type", () => {
  it.each<[NationalIdType, string, string | null]>([
    ["DNI", "70123456", null],
    ["DNI", "7012345", "national_id_format"],
    ["DNI", "7012345A", "national_id_format"],
    ["CE", "001234567", null],
    ["CE", "00123456", "national_id_format"],
    ["CE", "0012345678901", "national_id_format"],
    ["passport", "AB1234", null],
    ["passport", "AB123", "national_id_format"],
    ["passport", "", "required"],
  ])("%s %j → %s", (type, id, code) => {
    expect(nationalIdIssue(type, normalizeNationalId(id))).toBe(code);
  });

  it("checks the document against its type at object level", () => {
    expect(issuesOf({ ...A_STUDENT, nationalIdType: "CE" })).toEqual([["nationalId", "national_id_format"]]);
  });
});

describe("single fields", () => {
  it("names: required, then a length ceiling", () => {
    expect(issueOf(PersonNameField, "   ")).toBe("required");
    expect(issueOf(PersonNameField, "a".repeat(81))).toBe("too_long");
    expect(issueOf(PersonNameField, "Rosa")).toBeNull();
  });

  it("phone: counts digits, not characters", () => {
    expect(issueOf(PhoneField, "")).toBe("required");
    expect(issueOf(PhoneField, "12-34-5")).toBe("phone_format");
    expect(issueOf(PhoneField, "987 654")).toBeNull();
    expect(issueOf(PhoneField, "9".repeat(31))).toBe("too_long");
  });

  it("e-mail: format, any provider at field level", () => {
    expect(issueOf(EmailField, "")).toBe("required");
    expect(issueOf(EmailField, "nome123gmail.com")).toBe("email_format");
    expect(issueOf(EmailField, "someone@colegio.edu.pe")).toBeNull();
  });

  it("operation number: 6–20 letters, digits or dashes", () => {
    expect(issueOf(OperationNumberField, "12345")).toBe("operation_format");
    expect(issueOf(OperationNumberField, " 123456 ")).toBeNull();
    expect(issueOf(OperationNumberField, "1".repeat(21))).toBe("operation_format");
  });
});

describe("whole student", () => {
  it("accepts a valid student", () => {
    expect(issuesOf(A_STUDENT)).toEqual([]);
  });

  it("refuses an implausible birth date", () => {
    expect(issuesOf({ ...A_STUDENT, birthDate: "1890-01-01" })).toEqual([["birthDate", "birth_date_range"]]);
    expect(issuesOf({ ...A_STUDENT, birthDate: "2999-01-01" })).toEqual([["birthDate", "birth_date_range"]]);
    expect(issuesOf({ ...A_STUDENT, birthDate: "not a date" })).toEqual([["birthDate", "birth_date_range"]]);
  });

  it("asks for the departamento inside Peru only", () => {
    expect(issuesOf({ ...A_STUDENT, region: null })).toEqual([["region", "required"]]);
    expect(issuesOf({ ...A_STUDENT, country: "AR", region: null, city: "Rosario" })).toEqual([]);
  });

  it("the entity refuses with field + code, prefixed by what it is", () => {
    const attempt = () =>
      Student.create({ ...A_STUDENT, nationalId: "123", birthDate: new Date(A_STUDENT.birthDate) });

    expect(attempt).toThrow(InvalidFieldsError);
    try {
      attempt();
    } catch (error) {
      expect((error as InvalidFieldsError).status).toBe(400);
      expect((error as InvalidFieldsError).fields).toEqual([{ path: "student.nationalId", code: "national_id_format" }]);
    }
  });
});

describe("guardian", () => {
  const A_GUARDIAN = {
    studentId: "018f2b5c-5000-7000-8000-000000000001",
    firstName: "Ana",
    lastName: "Quispe",
    relationship: "mother",
    nationalIdType: "DNI",
    nationalId: "40123456",
    email: "ana@hotmail.com",
    phone: "987654321",
  };

  it("takes an address from any provider", () => {
    expect(CreateGuardianSchema.safeParse(A_GUARDIAN).success).toBe(true);
  });

  it("holds the document to the same format as the student's", () => {
    const result = CreateGuardianSchema.safeParse({ ...A_GUARDIAN, nationalId: "4012" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(["national_id_format"]);
  });
});

describe("Gmail username rules", () => {
  it.each([
    "rosa.quispe@gmail.com",
    "ROSA.Quispe@Gmail.com",
    "abcdef@gmail.com",
    "a23456789012345678901234567890@gmail.com",
  ])("accepts %s", (email) => {
    expect(gmailUsernameIssue(email)).toBeNull();
    expect(issueOf(EmailField, email)).toBeNull();
  });

  it.each([
    ["too short", "abcde@gmail.com"],
    ["too long", "a234567890123456789012345678901@gmail.com"],
    ["a plus alias", "rosa+curso@gmail.com"],
    ["an underscore", "rosa_quispe@gmail.com"],
    ["a leading dot", ".rosaquispe@gmail.com"],
    ["a trailing dot", "rosaquispe.@gmail.com"],
    ["two dots in a row", "rosa..quispe@gmail.com"],
  ])("refuses %s", (_label, email) => {
    expect(gmailUsernameIssue(email)).toBe("email_gmail_username_invalid");
    expect(issueOf(EmailField, email)).not.toBeNull();
  });

  it("leaves other providers alone", () => {
    expect(gmailUsernameIssue("rosa_q@hotmail.com")).toBeNull();
    expect(issueOf(EmailField, "rosa_q@hotmail.com")).toBeNull();
  });
});

describe("suggestEmailDomain", () => {
  it.each([
    ["rosa@gmial.com", "rosa@gmail.com"],
    ["rosa@gmail.co", "rosa@gmail.com"],
    ["rosa@gmai.com", "rosa@gmail.com"],
    ["rosa@gmal.com", "rosa@gmail.com"],
    ["rosa@gmail.con", "rosa@gmail.com"],
    ["rosa@gnail.com", "rosa@gmail.com"],
    ["rosa@gmail.cm", "rosa@gmail.com"],
    ["Rosa@Hotmial.com", "rosa@hotmail.com"],
    ["rosa@outlok.com", "rosa@outlook.com"],
    ["rosa@yaho.com", "rosa@yahoo.com"],
    ["rosa123gmail.com", "rosa123@gmail.com"],
  ])("suggests %s → %s", (typed, expected) => {
    expect(suggestEmailDomain(typed)).toBe(expected);
  });

  it.each(["rosa@gmail.com", "rosa@colegio.edu.pe", "rosa", "", "@gmial.com"])("has nothing for %s", (typed) => {
    expect(suggestEmailDomain(typed)).toBeNull();
  });
});
