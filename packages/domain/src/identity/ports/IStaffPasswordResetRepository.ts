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

export interface IStaffPasswordResetRepository {
  create(record: CreateStaffPasswordResetRecord): Promise<StaffPasswordReset>;
  findPendingByUserId(userId: string): Promise<StaffPasswordReset | null>;
  findById(id: string): Promise<StaffPasswordReset | null>;
  findByToken(token: string): Promise<StaffPasswordReset | null>;
  markCompleted(id: string): Promise<void>;
  markCancelled(id: string): Promise<void>;
  renew(id: string, expiresAt: Date): Promise<void>;
}
