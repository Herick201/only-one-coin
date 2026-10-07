import type { EmailNotification, Locale } from "../../notification/EmailNotification.js";
import type {
  NewPortalToken,
  PortalAccessOutcome,
  PortalAccessState,
  PortalAccessToken,
  PortalAccount,
  PortalIdentifier,
  PortalIdentity,
} from "./PortalAccess.js";

/** Creating the account for a student file — inside the payment settlement's
 * own transaction, or alone from the backoffice button. */
export interface PortalAccountProvisioning {
  studentId: string;
  actorId: string;
  activation: NewPortalToken;
  at: Date;
  /** Built once the account exists, with the stored token's id. */
  notify: (account: PortalAccount, tokenId: string) => EmailNotification[];
}

export interface IssuePortalTokenRequest {
  userId: string;
  token: NewPortalToken;
  /** Any token issued for the user after this instant → nothing is issued
   * (`null`). `null` skips the check (staff asked for it explicitly). */
  cooldownSince: Date | null;
  notify: (tokenId: string) => EmailNotification[];
}

export interface IPortalAccessRepository {
  /**
   * One transaction, locking the student row:
   * - the file already has an account → `already_linked`;
   * - another file with the same normalized document has one → this file is
   *   linked to it, no e-mail → `linked_existing`;
   * - the e-mail already belongs to another account → nothing, audit
   *   `portal_access.email_conflict` → `email_conflict`;
   * - otherwise: "user" (role student, no password), `students.user_id`, the
   *   activation token, the outbox rows of `notify`, audit
   *   `portal_access.created` → `created`.
   */
  provision(request: PortalAccountProvisioning): Promise<PortalAccessOutcome>;
  findAccountByStudent(studentId: string): Promise<PortalAccount | null>;
  /** Only a `student` account, not banned, with at least one live file linked
   * — an account nobody's file points at never signs in to the portal. */
  findAccountByIdentifier(identifier: PortalIdentifier): Promise<PortalAccount | null>;
  hasConfirmedEnrollment(studentId: string): Promise<boolean>;
  /** One transaction: cooldown check, pending tokens of the same user and
   * purpose marked used, the new token, the outbox rows of `notify`. */
  issueToken(request: IssuePortalTokenRequest): Promise<{ id: string } | null>;
  findToken(tokenHash: string): Promise<PortalAccessToken | null>;
  /** Marks it used only if it is still unused and unexpired; `false` when it
   * was not (a second click, a race). */
  consumeToken(id: string): Promise<boolean>;
  /** The newest live file linked to the account. */
  findIdentity(userId: string): Promise<PortalIdentity | null>;
  accessState(studentId: string): Promise<PortalAccessState>;
}

export interface IPortalLinkBuilder {
  /** The page that sets the password, for both purposes. */
  access(token: string, locale: Locale): string;
}

export interface IPortalPasswordSetter {
  /** Creates the credential on the first call, replaces it afterwards. */
  setPassword(userId: string, plainPassword: string): Promise<void>;
}
