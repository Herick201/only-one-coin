export { BaseModel, BaseModelPropsSchema } from "./shared/base/BaseModel.js";
export type { BaseModelProps } from "./shared/base/BaseModel.js";
export {
  BASE_PROPS_KEYS,
  SoftDeletableModel,
  SoftDeletableModelPropsSchema,
} from "./shared/base/SoftDeletableModel.js";
export type { SoftDeletableModelProps } from "./shared/base/SoftDeletableModel.js";
export { BaseUseCase } from "./shared/base/BaseUseCase.js";
export type {
  IBaseRepository,
  ISoftDeletableRepository,
} from "./shared/base/IBaseRepository.js";

export { HttpError } from "./shared/base/errors/HttpError.js";
export type { HttpErrorParams } from "./shared/base/errors/HttpError.js";
export { UnauthorizedError } from "./shared/base/errors/UnauthorizedError.js";
export { ForbiddenError } from "./shared/base/errors/ForbiddenError.js";
export { NotFoundError } from "./shared/base/errors/NotFoundError.js";
export { ConflictError } from "./shared/base/errors/ConflictError.js";
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
export { GuardianRequiredForMinorError, StudentAlreadyRegisteredError } from "./student/errors.js";
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
export type {
  IEnrollmentEmailContextLookup,
  EnrollmentEmailContext,
} from "./enrollment/EnrollmentEmailContextLookup.js";

export {
  LocaleSchema,
  DEFAULT_LOCALE,
  EMAIL_TEMPLATE_KEYS,
} from "./notification/EmailNotification.js";
export type {
  Locale,
  EmailTemplateKey,
  EmailTemplateVars,
  EmailNotification,
} from "./notification/EmailNotification.js";
export {
  enrollmentRecipients,
  enrollmentReceivedEmails,
  type EnrollmentEmailFacts,
  type EnrollmentRecipient,
  type EnrollmentRecipientKind,
} from "./notification/enrollmentEmails.js";
export type {
  IPublicEnrollmentRepository,
  PublicEnrollmentContext,
  SubmitPublicEnrollmentParams,
  SubmitPublicEnrollmentResult,
} from "./enrollment/PublicEnrollmentRepository.js";
export {
  ClassGroupFullError,
  ClassGroupNotFoundError,
  OperationNumberAlreadyUsedError,
  PlanPriceNotFoundError,
  ReceiptNotReadyError,
  ReceiptNotUploadedError,
  ReceiptUploadNotFoundError,
  SeatHoldExpiredError,
  StudentBelowMinimumAgeError,
} from "./enrollment/errors.js";
export {
  EnrollmentOriginSchema,
  EnrollmentOriginInputSchema,
  type EnrollmentOrigin,
} from "./enrollment/EnrollmentOrigin.js";
export type { SeatHold } from "./enrollment/SeatHold.js";
export type { ISeatHoldRepository, ClaimSeatHoldResult } from "./enrollment/SeatHoldRepository.js";
export { ClaimSeatHoldUseCase, type ClaimSeatHoldInput } from "./enrollment/ClaimSeatHoldUseCase.js";
export { ReleaseSeatHoldUseCase } from "./enrollment/ReleaseSeatHoldUseCase.js";
export { ExpireSeatHoldsUseCase, EXPIRE_SEAT_HOLDS_BATCH } from "./enrollment/ExpireSeatHoldsUseCase.js";
export type { ReceiptUpload, ReceiptUploadStatus } from "./enrollment/ReceiptUpload.js";
export type { IReceiptUploadRepository } from "./enrollment/ReceiptUploadRepository.js";
export type { IReceiptStorage, PresignedReceiptUpload, StoredObjectHead } from "./enrollment/ReceiptStorage.js";
export {
  exifSignals,
  normalizeOperationNumber,
  payerNameMatches,
  routesToHumanReview,
  type OperationNumberClaim,
  type ReceiptExifFacts,
  type ReceiptFraudSignal,
  type ReceiptFraudSignalKind,
} from "./enrollment/ReceiptScreening.js";
export type {
  IReceiptScreeningRepository,
  ReceiptLookalike,
  ReceiptScreeningSubject,
} from "./enrollment/ReceiptScreeningRepository.js";
export {
  ScreenReceiptUploadUseCase,
  MAX_LOOKALIKE_SIGNALS,
  type ScreenReceiptUploadInput,
  type ScreenReceiptUploadOutput,
} from "./enrollment/ScreenReceiptUploadUseCase.js";
export {
  RequestReceiptUploadUseCase,
  RECEIPT_CONTENT_TYPES,
  type ReceiptContentType,
  type RequestReceiptUploadInput,
  type RequestReceiptUploadOutput,
} from "./enrollment/RequestReceiptUploadUseCase.js";
export {
  ConfirmReceiptUploadUseCase,
  type ConfirmReceiptUploadInput,
  type ConfirmReceiptUploadOutput,
} from "./enrollment/ConfirmReceiptUploadUseCase.js";
export {
  CreateManualEnrollmentUseCase,
  type CreateManualEnrollmentInput,
  type CreateManualEnrollmentOutput,
} from "./enrollment/CreateManualEnrollmentUseCase.js";
export {
  SubmitPublicEnrollmentUseCase,
  type SubmitPublicEnrollmentInput,
  type SubmitPublicEnrollmentOutput,
} from "./enrollment/SubmitPublicEnrollmentUseCase.js";

export type { Role } from "./identity/Role.js";
export { MASTER_EMAIL_DOMAINS, canHoldMaster, isOwnerEmail } from "./identity/Role.js";
export type { AuthenticatedUser } from "./identity/AuthenticatedUser.js";
export {
  NotFreshlyAuthenticatedError,
  InsufficientPrivilegeError,
  CannotActOnSelfError,
} from "./identity/errors.js";
export type { ICurrentSessionPort } from "./identity/ports/ICurrentSessionPort.js";
export type { IUserRoleRepository } from "./identity/ports/IUserRoleRepository.js";
export type { IAuditLogRepository, AuditLogEntry } from "./identity/ports/IAuditLogRepository.js";
export type { IFreshAuthVerifier } from "./identity/ports/IFreshAuthVerifier.js";
export type {
  IStaffInviteRepository,
  StaffInvite,
  CreateStaffInviteRecord,
} from "./identity/ports/IStaffInviteRepository.js";
export type {
  IStaffAccountProvisioner,
  ProvisionStaffAccountInput,
  ProvisionStaffAccountOutput,
} from "./identity/ports/IStaffAccountProvisioner.js";
export type { IStaffAccessRepository } from "./identity/ports/IStaffAccessRepository.js";
export type { IStaffUserLookup, StaffUserDisplay } from "./identity/ports/IStaffUserLookup.js";
export type {
  IStaffPasswordResetRepository,
  StaffPasswordReset,
  CreateStaffPasswordResetRecord,
} from "./identity/ports/IStaffPasswordResetRepository.js";
export type { IStaffPasswordSetter } from "./identity/ports/IStaffPasswordSetter.js";
export {
  PromoteUserRoleUseCase,
  type PromoteUserRoleInput,
  type PromoteUserRoleOutput,
} from "./identity/PromoteUserRoleUseCase.js";
export {
  CreateStaffInviteUseCase,
  type CreateStaffInviteInput,
  type CreateStaffInviteOutput,
} from "./identity/CreateStaffInviteUseCase.js";
export {
  RenewStaffInviteUseCase,
  type RenewStaffInviteInput,
  type RenewStaffInviteOutput,
} from "./identity/RenewStaffInviteUseCase.js";
export {
  CancelStaffInviteUseCase,
  type CancelStaffInviteInput,
} from "./identity/CancelStaffInviteUseCase.js";
export {
  CompleteStaffInviteUseCase,
  type CompleteStaffInviteInput,
  type CompleteStaffInviteOutput,
} from "./identity/CompleteStaffInviteUseCase.js";
export {
  RemoveStaffAccessUseCase,
  type RemoveStaffAccessInput,
} from "./identity/RemoveStaffAccessUseCase.js";
export {
  RestoreStaffAccessUseCase,
  type RestoreStaffAccessInput,
} from "./identity/RestoreStaffAccessUseCase.js";
export {
  CreateStaffPasswordResetUseCase,
  type CreateStaffPasswordResetInput,
  type CreateStaffPasswordResetOutput,
} from "./identity/CreateStaffPasswordResetUseCase.js";
export {
  RenewStaffPasswordResetUseCase,
  type RenewStaffPasswordResetInput,
  type RenewStaffPasswordResetOutput,
} from "./identity/RenewStaffPasswordResetUseCase.js";
export {
  CancelStaffPasswordResetUseCase,
  type CancelStaffPasswordResetInput,
} from "./identity/CancelStaffPasswordResetUseCase.js";
export {
  CompleteStaffPasswordResetUseCase,
  type CompleteStaffPasswordResetInput,
  type CompleteStaffPasswordResetOutput,
} from "./identity/CompleteStaffPasswordResetUseCase.js";

export type {
  FeatureFlagOverride,
  FeatureFlagOverrideView,
} from "./platform/FeatureFlagOverride.js";
export type { IFeatureFlagOverrideRepository } from "./platform/ports/IFeatureFlagOverrideRepository.js";
export { NotAPlatformOwnerError, InvalidPlatformSettingError } from "./platform/errors.js";
export {
  CHECKOUT_HOLD_MINUTES_MIN,
  CHECKOUT_HOLD_MINUTES_MAX,
  CheckoutHoldMinutesSchema,
  type PlatformSettings,
} from "./platform/PlatformSettings.js";
export type { IPlatformSettingsRepository } from "./platform/ports/IPlatformSettingsRepository.js";
export {
  UpdateCheckoutHoldMinutesUseCase,
  type UpdateCheckoutHoldMinutesInput,
} from "./platform/UpdateCheckoutHoldMinutesUseCase.js";
export {
  SetFeatureFlagOverrideUseCase,
  type SetFeatureFlagOverrideInput,
  type SetFeatureFlagOverrideOutput,
} from "./platform/SetFeatureFlagOverrideUseCase.js";

export {
  CatalogEntryKindSchema,
  type CatalogEntryKind,
  type CatalogEntryState,
} from "./catalog/CatalogEntry.js";
export type { ICatalogEntryRepository } from "./catalog/ports/ICatalogEntryRepository.js";
export {
  CatalogEntryNotFoundError,
  CourseNotFoundError,
  PlanNotFoundError,
  PriceInPastError,
  PeriodNotFoundError,
  CatalogClassGroupNotFoundError,
  InvalidDateRangeError,
  InvalidStatusTransitionError,
  ClassGroupIncompleteError,
  CapacityBelowSeatsTakenError,
  ClassGroupCourseLockedError,
  PeriodAlreadyDuplicatedError,
  DuplicateSamePeriodError,
} from "./catalog/errors.js";
export {
  AcademicPeriod,
  AcademicPeriodPropsSchema,
  CreateAcademicPeriodSchema,
  UpdateAcademicPeriodSchema,
  type AcademicPeriodProps,
  type CreateAcademicPeriodDTO,
  type UpdateAcademicPeriodDTO,
} from "./catalog/AcademicPeriod.js";
export {
  ClassGroup,
  ClassGroupPropsSchema,
  ClassGroupStatusSchema,
  CreateClassGroupSchema,
  UpdateClassGroupSchema,
  NEXT_CLASS_GROUP_STATUS,
  WeekdaySchema,
  WeeklySlotSchema,
  type ClassGroupProps,
  type ClassGroupStatus,
  type CreateClassGroupDTO,
  type UpdateClassGroupDTO,
  type WeeklySlot,
} from "./catalog/ClassGroup.js";
export type { IAcademicPeriodRepository } from "./catalog/ports/IAcademicPeriodRepository.js";
export type { IClassGroupRepository } from "./catalog/ports/IClassGroupRepository.js";
export { CreateAcademicPeriodUseCase, type CreateAcademicPeriodInput } from "./catalog/CreateAcademicPeriodUseCase.js";
export { UpdateAcademicPeriodUseCase, type UpdateAcademicPeriodInput } from "./catalog/UpdateAcademicPeriodUseCase.js";
export { CreateClassGroupUseCase, type CreateClassGroupInput } from "./catalog/CreateClassGroupUseCase.js";
export { UpdateClassGroupUseCase, type UpdateClassGroupInput } from "./catalog/UpdateClassGroupUseCase.js";
export { DuplicateClassGroupsUseCase, type DuplicateClassGroupsInput } from "./catalog/DuplicateClassGroupsUseCase.js";
export {
  AdvanceClassGroupStatusUseCase,
  type AdvanceClassGroupStatusInput,
} from "./catalog/AdvanceClassGroupStatusUseCase.js";
export { Plan, PlanPrice, PRICE_PAST_TOLERANCE_MS, type PlanProps, type PlanPriceProps } from "./catalog/Plan.js";
export type { IPlanRepository } from "./catalog/ports/IPlanRepository.js";
export { CreatePlanUseCase, type CreatePlanInput } from "./catalog/CreatePlanUseCase.js";
export { RenamePlanUseCase, type RenamePlanInput } from "./catalog/RenamePlanUseCase.js";
export { SchedulePlanPriceUseCase, type SchedulePlanPriceInput } from "./catalog/SchedulePlanPriceUseCase.js";
export {
  Course,
  CertificateRuleSchema,
  CourseOptionsSchema,
  CreateCourseSchema,
  UpdateCourseSchema,
  type CertificateRule,
  type CourseProps,
  type CreateCourseDTO,
  type UpdateCourseDTO,
} from "./catalog/Course.js";
export type { ICourseRepository } from "./catalog/ports/ICourseRepository.js";
export { CreateCourseUseCase, type CreateCourseInput } from "./catalog/CreateCourseUseCase.js";
export { UpdateCourseUseCase, type UpdateCourseInput } from "./catalog/UpdateCourseUseCase.js";
export {
  RetireCatalogEntryUseCase,
  type RetireCatalogEntryInput,
  type RetireCatalogEntryOutput,
} from "./catalog/RetireCatalogEntryUseCase.js";
export {
  RestoreCatalogEntryUseCase,
  type RestoreCatalogEntryInput,
  type RestoreCatalogEntryOutput,
} from "./catalog/RestoreCatalogEntryUseCase.js";
