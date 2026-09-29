import { Student } from "../student/Student.js";
import type { EmailNotification, Locale } from "./EmailNotification.js";

/**
 * What an enrollment e-mail needs to know, read off the records rather than
 * off a request — the enrollment path that produces it (public checkout or the
 * manual backoffice one) is irrelevant to what the e-mail says.
 */
export interface EnrollmentEmailFacts {
  enrollmentId: string;
  student: { firstName: string; lastName: string; email: string; birthDate: Date };
  guardian: { firstName: string; email: string } | null;
  courseName: string;
  classGroupStartsOn: Date;
  amountCents: number;
}

export type EnrollmentRecipientKind = "student" | "guardian";

export interface EnrollmentRecipient {
  kind: EnrollmentRecipientKind;
  to: string;
  name: string;
}

/**
 * Who hears about an enrollment. The student always does — their personal
 * Gmail is the account the course reaches them on (CLAUDE.md §1). A minor's
 * guardian hears about it too: they are the one who consented and, usually,
 * the one who paid (decision of 27/09/2026). An adult's optional guardian
 * does not.
 *
 * Only for messages about the enrollment itself — portal credentials belong
 * to the student's own account and are never copied to anybody.
 */
export function enrollmentRecipients(facts: EnrollmentEmailFacts): EnrollmentRecipient[] {
  const recipients: EnrollmentRecipient[] = [
    { kind: "student", to: facts.student.email, name: facts.student.firstName },
  ];

  if (facts.guardian && Student.isMinorBornOn(facts.student.birthDate)) {
    recipients.push({ kind: "guardian", to: facts.guardian.email, name: facts.guardian.firstName });
  }

  return recipients;
}

/** "We received your enrollment" — emitted by both enrollment paths in the
 * same transaction that writes the enrollment (CLAUDE.md §1, decision of
 * 27/09/2026: the manual backoffice path sends it too). */
export function enrollmentReceivedEmails(facts: EnrollmentEmailFacts, locale: Locale): EmailNotification[] {
  const studentName = `${facts.student.firstName} ${facts.student.lastName}`;

  return enrollmentRecipients(facts).map((recipient) => ({
    templateKey: "enrollment_received",
    to: recipient.to,
    locale,
    vars: {
      recipientName: recipient.name,
      studentName,
      courseName: facts.courseName,
      startsOn: facts.classGroupStartsOn.toISOString(),
      amountCents: facts.amountCents,
    },
    dedupeKey: `enrollment_received:${facts.enrollmentId}:${recipient.kind}`,
  }));
}
