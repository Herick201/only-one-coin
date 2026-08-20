export { BaseModel } from "./shared/base/BaseModel.js";
export { BaseUseCase } from "./shared/base/BaseUseCase.js";
export type { IBaseRepository } from "./shared/base/IBaseRepository.js";

export { HttpError } from "./shared/base/errors/HttpError.js";
export type { HttpErrorParams } from "./shared/base/errors/HttpError.js";
export { UnauthorizedError } from "./shared/base/errors/UnauthorizedError.js";
export { ForbiddenError } from "./shared/base/errors/ForbiddenError.js";
export { NotFoundError } from "./shared/base/errors/NotFoundError.js";
export { UnableToProcessEntryError } from "./shared/base/errors/UnableToProcessEntryError.js";

export { Example, ExamplePropsSchema, CreateExampleSchema } from "./example/Example.js";
export type { ExampleProps, CreateExampleDTO } from "./example/Example.js";
export type { IExampleRepository } from "./example/ExampleRepository.js";
export { CreateExampleUseCase } from "./example/CreateExampleUseCase.js";

export type { Role } from "./identity/Role.js";
export type { AuthenticatedUser } from "./identity/AuthenticatedUser.js";
export { NotFreshlyAuthenticatedError, InsufficientPrivilegeError } from "./identity/errors.js";
export type { ICurrentSessionPort } from "./identity/ports/ICurrentSessionPort.js";
export type { IUserRoleRepository } from "./identity/ports/IUserRoleRepository.js";
export type { IAuditLogRepository, AuditLogEntry } from "./identity/ports/IAuditLogRepository.js";
export type { IFreshAuthVerifier } from "./identity/ports/IFreshAuthVerifier.js";
export {
  PromoteUserRoleUseCase,
  type PromoteUserRoleInput,
  type PromoteUserRoleOutput,
} from "./identity/PromoteUserRoleUseCase.js";
