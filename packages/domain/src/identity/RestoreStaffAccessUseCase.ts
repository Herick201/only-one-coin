import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { CannotActOnSelfError } from "./errors.js";
import type { IAuditLogRepository } from "./ports/IAuditLogRepository.js";
import type { IStaffAccessRepository } from "./ports/IStaffAccessRepository.js";

export interface RestoreStaffAccessInput {
  actorId: string;
  targetUserId: string;
}

export class RestoreStaffAccessUseCase extends BaseUseCase<RestoreStaffAccessInput, void> {
  constructor(
    private readonly staffAccessRepository: IStaffAccessRepository,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: RestoreStaffAccessInput): Promise<void> {
    if (input.actorId === input.targetUserId) {
      throw new CannotActOnSelfError();
    }

    await this.staffAccessRepository.unban(input.targetUserId);

    await this.auditLogRepository.append({
      actorId: input.actorId,
      action: "staff.access_restored",
      targetId: input.targetUserId,
      metadata: {},
      at: new Date(),
    });
  }
}
