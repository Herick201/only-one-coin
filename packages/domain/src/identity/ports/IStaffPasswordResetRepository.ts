import type { EmailNotification } from "../../notification/EmailNotification.js";

export interface StaffPasswordReset {
  id: string;
  userId: string;
  token: string;
  status: "pending" | "completed" | "cancelled";
  expiresAt: Date;
}

export interface CreateStaffPasswordResetRecord {
  userId: string;
  token: string;
  requestedBy: string;
  expiresAt: Date;
}

/**
 * A reset the account owner asked for from the login screen (OOC-30), as
 * opposed to one an admin generated for them (`create`).
 */
export interface IssueSelfServiceResetRecord {
  userId: string;
  /** Used only when no reset is pending — a pending one keeps its token. */
  token: string;
  /** A floor: a pending link that already lives longer is never shortened. */
  expiresAt: Date;
  requestedAt: Date;
  /** A pending reset last issued after this instant is left alone, and no e-mail goes out. */
  cooldownSince: Date;
}

export interface IStaffPasswordResetRepository {
  create(record: CreateStaffPasswordResetRecord): Promise<StaffPasswordReset>;
  findPendingByUserId(userId: string): Promise<StaffPasswordReset | null>;
  findById(id: string): Promise<StaffPasswordReset | null>;
  findByToken(token: string): Promise<StaffPasswordReset | null>;
  markCompleted(id: string): Promise<void>;
  markCancelled(id: string): Promise<void>;
  renew(id: string, expiresAt: Date): Promise<void>;
  /**
   * Opens a pending reset for the user, or extends the one already pending,
   * and writes the e-mails `notify` builds for it in the same transaction —
   * the link and the message carrying it commit together or not at all.
   * Atomic against a concurrent request for the same user. Returns null,
   * writing nothing, when the pending reset was issued after `cooldownSince`.
   */
  issueSelfService(
    record: IssueSelfServiceResetRecord,
    notify: (reset: StaffPasswordReset) => EmailNotification[],
  ): Promise<StaffPasswordReset | null>;
}
