export { BaseModel } from "./shared/base/BaseModel.js";
export { BaseUseCase } from "./shared/base/BaseUseCase.js";
export type { IBaseRepository } from "./shared/base/IBaseRepository.js";

export { HttpError } from "./shared/base/errors/HttpError.js";
export type { HttpErrorParams } from "./shared/base/errors/HttpError.js";
export { UnauthorizedError } from "./shared/base/errors/UnauthorizedError.js";
export { ForbiddenError } from "./shared/base/errors/ForbiddenError.js";
export { NotFoundError } from "./shared/base/errors/NotFoundError.js";
export { UnableToProcessEntryError } from "./shared/base/errors/UnableToProcessEntryError.js";

export {
  Student,
  StudentPropsSchema,
  CreateStudentSchema,
  NationalIdTypeSchema,
} from "./student/Student.js";
export type { StudentProps, CreateStudentDTO, NationalIdType } from "./student/Student.js";
export type { IStudentRepository } from "./student/StudentRepository.js";
export {
  Guardian,
  GuardianPropsSchema,
  CreateGuardianSchema,
  GuardianRelationshipSchema,
} from "./student/Guardian.js";
export type { GuardianProps, CreateGuardianDTO, GuardianRelationship } from "./student/Guardian.js";
export type { IGuardianRepository } from "./student/GuardianRepository.js";
export { GuardianRequiredForMinorError } from "./student/errors.js";
export {
  RegisterStudentUseCase,
  type RegisterStudentInput,
  type RegisterStudentOutput,
} from "./student/RegisterStudentUseCase.js";

export { Enrollment, EnrollmentPropsSchema, SeatStatusSchema } from "./enrollment/Enrollment.js";
export type { EnrollmentProps, SeatStatus } from "./enrollment/Enrollment.js";
export { Payment, PaymentPropsSchema, PaymentMethodSchema, PaymentRailSchema, PaymentStatusSchema } from "./enrollment/Payment.js";
export type { PaymentProps, PaymentMethod, PaymentStatus } from "./enrollment/Payment.js";
export type { IEnrollmentRepository } from "./enrollment/EnrollmentRepository.js";
export type { IPlanPriceLookup } from "./enrollment/PlanPriceLookup.js";
export { ClassGroupFullError, PlanPriceNotFoundError } from "./enrollment/errors.js";
export {
  CreateManualEnrollmentUseCase,
  type CreateManualEnrollmentInput,
  type CreateManualEnrollmentOutput,
} from "./enrollment/CreateManualEnrollmentUseCase.js";

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
