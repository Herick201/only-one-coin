import type { FastifyBaseLogger } from "fastify";
import {
  CancelStaffInviteUseCase,
  ClaimSeatHoldUseCase,
  CancelStaffPasswordResetUseCase,
  CompleteStaffInviteUseCase,
  CompleteStaffPasswordResetUseCase,
  ConfirmReceiptUploadUseCase,
  CreateCourseUseCase,
  CreateAcademicPeriodUseCase,
  UpdateAcademicPeriodUseCase,
  DuplicateClassGroupsUseCase,
  CreateClassGroupUseCase,
  UpdateClassGroupUseCase,
  AdvanceClassGroupStatusUseCase,
  JoinWaitlistUseCase,
  LeaveWaitlistUseCase,
  CreateManualEnrollmentUseCase,
  CreatePlanUseCase,
  CreateStaffInviteUseCase,
  CreateStaffPasswordResetUseCase,
  ExpireSeatHoldsUseCase,
  PromoteUserRoleUseCase,
  RegisterStudentUseCase,
  RenamePlanUseCase,
  ReleaseSeatHoldUseCase,
  RequestReceiptUploadUseCase,
  ScreenReceiptUploadUseCase,
  RetireCatalogEntryUseCase,
  RemoveStaffAccessUseCase,
  RenewStaffInviteUseCase,
  RenewStaffPasswordResetUseCase,
  RestoreCatalogEntryUseCase,
  RestoreStaffAccessUseCase,
  SchedulePlanPriceUseCase,
  SetFeatureFlagOverrideUseCase,
  SubmitPublicEnrollmentUseCase,
  UpdateCheckoutHoldMinutesUseCase,
  UpdateCourseUseCase,
  type IAuditLogRepository,
  type ICatalogEntryRepository,
  type ICourseRepository,
  type IAcademicPeriodRepository,
  type IClassGroupRepository,
  type IWaitlistRepository,
  type ICurrentSessionPort,
  type IEnrollmentRepository,
  type IFeatureFlagOverrideRepository,
  type IFreshAuthVerifier,
  type IGuardianRepository,
  type IPlanPriceLookup,
  type IPlanRepository,
  type IPlatformSettingsRepository,
  type IPublicEnrollmentRepository,
  type IReceiptUploadRepository,
  type ISeatHoldRepository,
  type IStaffAccessRepository,
  type IStaffAccountProvisioner,
  type IStaffInviteRepository,
  type IStaffPasswordResetRepository,
  type IStaffPasswordSetter,
  type IStaffUserLookup,
  type IStudentRepository,
  type IUserRoleRepository,
} from "@ooc/domain";
import { loadConfig, type Config } from "./config.js";
import { createLogger } from "./infra/logger.js";
import { createAuth, type Auth } from "./infra/auth/betterAuth.js";
import { BetterAuthCurrentSessionPort } from "./infra/identity/BetterAuthCurrentSessionPort.js";
import { BetterAuthFreshAuthVerifier } from "./infra/identity/BetterAuthFreshAuthVerifier.js";
import { BetterAuthStaffAccountProvisioner } from "./infra/identity/BetterAuthStaffAccountProvisioner.js";
import { BetterAuthStaffPasswordSetter } from "./infra/identity/BetterAuthStaffPasswordSetter.js";
import { DrizzleAuditLogRepository } from "./infra/identity/DrizzleAuditLogRepository.js";
import { DrizzleStaffAccessRepository } from "./infra/identity/DrizzleStaffAccessRepository.js";
import { DrizzleStaffInviteRepository } from "./infra/identity/DrizzleStaffInviteRepository.js";
import { DrizzleStaffPasswordResetRepository } from "./infra/identity/DrizzleStaffPasswordResetRepository.js";
import { DrizzleStaffUserLookup } from "./infra/identity/DrizzleStaffUserLookup.js";
import { DrizzleUserRoleRepository } from "./infra/identity/DrizzleUserRoleRepository.js";
import { createDb, type Db } from "./infra/db/client.js";
import { DrizzleStudentRepository } from "./infra/persistence/student/DrizzleStudentRepository.js";
import { DrizzleGuardianRepository } from "./infra/persistence/student/DrizzleGuardianRepository.js";
import { DrizzleEnrollmentRepository } from "./infra/persistence/enrollment/DrizzleEnrollmentRepository.js";
import { DrizzlePublicEnrollmentRepository } from "./infra/persistence/enrollment/DrizzlePublicEnrollmentRepository.js";
import { DrizzlePlanPriceLookup } from "./infra/persistence/enrollment/DrizzlePlanPriceLookup.js";
import { DrizzleSeatHoldRepository } from "./infra/persistence/enrollment/DrizzleSeatHoldRepository.js";
import {
  DrizzleReceiptUploadRepository,
  type IReceiptNormalizationStore,
} from "./infra/persistence/enrollment/DrizzleReceiptUploadRepository.js";
import { DrizzleReceiptScreeningRepository } from "./infra/persistence/enrollment/DrizzleReceiptScreeningRepository.js";
import { createS3Client } from "./infra/storage/s3Client.js";
import { TigrisReceiptStorage } from "./infra/storage/TigrisReceiptStorage.js";
import { ReceiptObjectStore } from "./infra/storage/ReceiptObjectStore.js";
import { ListStudentsQuery } from "./infra/persistence/student/ListStudentsQuery.js";
import { GetStudentQuery } from "./infra/persistence/student/GetStudentQuery.js";
import { ListEnrollmentsQuery } from "./infra/persistence/enrollment/ListEnrollmentsQuery.js";
import { ListOpenClassGroupsQuery } from "./infra/persistence/catalog/ListOpenClassGroupsQuery.js";
import { GetPublicCatalogQuery } from "./infra/persistence/catalog/GetPublicCatalogQuery.js";
import { DrizzleCatalogEntryRepository } from "./infra/persistence/catalog/DrizzleCatalogEntryRepository.js";
import { DrizzleCourseRepository } from "./infra/persistence/catalog/DrizzleCourseRepository.js";
import { DrizzlePlanRepository } from "./infra/persistence/catalog/DrizzlePlanRepository.js";
import { ListCoursesQuery } from "./infra/persistence/catalog/ListCoursesQuery.js";
import { GetCourseQuery } from "./infra/persistence/catalog/GetCourseQuery.js";
import { DrizzleAcademicPeriodRepository } from "./infra/persistence/catalog/DrizzleAcademicPeriodRepository.js";
import { DrizzleClassGroupRepository } from "./infra/persistence/catalog/DrizzleClassGroupRepository.js";
import { DrizzleWaitlistRepository } from "./infra/persistence/catalog/DrizzleWaitlistRepository.js";
import { ListPeriodsQuery } from "./infra/persistence/catalog/ListPeriodsQuery.js";
import { ListClassGroupsQuery } from "./infra/persistence/catalog/ListClassGroupsQuery.js";
import { ListWaitlistQuery } from "./infra/persistence/catalog/ListWaitlistQuery.js";
import { ListStaffQuery } from "./infra/persistence/identity/ListStaffQuery.js";
import { ListStaffRoleChangesQuery } from "./infra/persistence/identity/ListStaffRoleChangesQuery.js";
import { DrizzleFeatureFlagOverrideRepository } from "./infra/persistence/platform/DrizzleFeatureFlagOverrideRepository.js";
import { DrizzlePlatformSettingsRepository } from "./infra/persistence/platform/DrizzlePlatformSettingsRepository.js";
import { DrizzleEnrollmentEmailContextLookup } from "./infra/persistence/enrollment/DrizzleEnrollmentEmailContextLookup.js";
import { DrizzleOutboxRepository, type IOutboxStore } from "./infra/persistence/notification/DrizzleOutboxRepository.js";
import { createNotificationProvider } from "./infra/notification/createNotificationProvider.js";
import type { NotificationProvider } from "@ooc/notifications";

export interface AppRepositories {
  catalogEntry: ICatalogEntryRepository;
  course: ICourseRepository;
  academicPeriod: IAcademicPeriodRepository;
  classGroup: IClassGroupRepository;
  waitlist: IWaitlistRepository;
  plan: IPlanRepository;
  student: IStudentRepository;
  guardian: IGuardianRepository;
  enrollment: IEnrollmentRepository;
  publicEnrollment: IPublicEnrollmentRepository;
  seatHold: ISeatHoldRepository;
  /** Widened past the domain port: the normalize worker's own read/write
   * shape (`IReceiptNormalizationStore`) lives here too, the same way
   * `AppNotifications.outbox` is `IOutboxStore` rather than a domain port —
   * this is infra a worker consumes directly, not a usecase's dependency. */
  receiptUpload: IReceiptUploadRepository & IReceiptNormalizationStore;
  planPriceLookup: IPlanPriceLookup;
  staffInvite: IStaffInviteRepository;
  staffPasswordReset: IStaffPasswordResetRepository;
  featureFlagOverride: IFeatureFlagOverrideRepository;
  platformSettings: IPlatformSettingsRepository;
}

export interface AppUseCases {
  student: {
    register: RegisterStudentUseCase;
  };
  enrollment: {
    createManual: CreateManualEnrollmentUseCase;
    submitPublic: SubmitPublicEnrollmentUseCase;
    claimSeatHold: ClaimSeatHoldUseCase;
    releaseSeatHold: ReleaseSeatHoldUseCase;
    expireSeatHolds: ExpireSeatHoldsUseCase;
    requestReceiptUpload: RequestReceiptUploadUseCase;
    confirmReceiptUpload: ConfirmReceiptUploadUseCase;
    /** Run by the `receipt-screen` worker, never a route (OOC-22). */
    screenReceiptUpload: ScreenReceiptUploadUseCase;
  };
  staff: {
    promoteRole: PromoteUserRoleUseCase;
    createInvite: CreateStaffInviteUseCase;
    renewInvite: RenewStaffInviteUseCase;
    cancelInvite: CancelStaffInviteUseCase;
    completeInvite: CompleteStaffInviteUseCase;
    removeAccess: RemoveStaffAccessUseCase;
    restoreAccess: RestoreStaffAccessUseCase;
    createPasswordReset: CreateStaffPasswordResetUseCase;
    renewPasswordReset: RenewStaffPasswordResetUseCase;
    cancelPasswordReset: CancelStaffPasswordResetUseCase;
    completePasswordReset: CompleteStaffPasswordResetUseCase;
  };
  platform: {
    setFeatureFlag: SetFeatureFlagOverrideUseCase;
    updateCheckoutHoldMinutes: UpdateCheckoutHoldMinutesUseCase;
  };
  catalog: {
    retire: RetireCatalogEntryUseCase;
    restore: RestoreCatalogEntryUseCase;
    createCourse: CreateCourseUseCase;
    updateCourse: UpdateCourseUseCase;
    createPlan: CreatePlanUseCase;
    renamePlan: RenamePlanUseCase;
    schedulePlanPrice: SchedulePlanPriceUseCase;
    createPeriod: CreateAcademicPeriodUseCase;
    updatePeriod: UpdateAcademicPeriodUseCase;
    duplicatePeriod: DuplicateClassGroupsUseCase;
    createClassGroup: CreateClassGroupUseCase;
    updateClassGroup: UpdateClassGroupUseCase;
    advanceClassGroupStatus: AdvanceClassGroupStatusUseCase;
    joinWaitlist: JoinWaitlistUseCase;
    leaveWaitlist: LeaveWaitlistUseCase;
  };
}

export interface AppQueries {
  listStudents: ListStudentsQuery;
  listEnrollments: ListEnrollmentsQuery;
  getStudent: GetStudentQuery;
  listOpenClassGroups: ListOpenClassGroupsQuery;
  getPublicCatalog: GetPublicCatalogQuery;
  listCourses: ListCoursesQuery;
  getCourse: GetCourseQuery;
  listPeriods: ListPeriodsQuery;
  listClassGroups: ListClassGroupsQuery;
  listWaitlist: ListWaitlistQuery;
  listStaff: ListStaffQuery;
  listStaffRoleChanges: ListStaffRoleChangesQuery;
}

export interface AppIdentity {
  currentSession: ICurrentSessionPort;
  freshAuthVerifier: IFreshAuthVerifier;
  userRoleRepository: IUserRoleRepository;
  auditLogRepository: IAuditLogRepository;
  staffAccessRepository: IStaffAccessRepository;
  staffAccountProvisioner: IStaffAccountProvisioner;
  staffUserLookup: IStaffUserLookup;
  staffPasswordSetter: IStaffPasswordSetter;
}

/** What the e-mail workers need — the outbox and the (guarded) provider. */
export interface AppNotifications {
  outbox: IOutboxStore;
  provider: NotificationProvider;
}

/** What the receipt normalize worker needs — the raw bucket GET/PUT/DELETE
 * (OOC-19). Not `IReceiptStorage`: that port is scoped to the two
 * HTTP-facing usecases (mint a target, HEAD it), never to downloading or
 * writing bytes. */
export interface AppStorage {
  objectStore: ReceiptObjectStore;
}

export interface AppContainer {
  production: boolean;
  config: Config;
  logger: FastifyBaseLogger;
  auth: Auth;
  db: Db;
  identity: AppIdentity;
  notifications: AppNotifications;
  storage: AppStorage;
  repositories: AppRepositories;
  useCases: AppUseCases;
  queries: AppQueries;
}

function buildContainer(): AppContainer {
  const config = loadConfig();
  const logger = createLogger(config);

  // Auth
  const auth = createAuth(config);
  const currentSession = new BetterAuthCurrentSessionPort(auth);

  // Persistence
  const db = createDb(config);
  const freshAuthVerifier = new BetterAuthFreshAuthVerifier(auth, db);

  // Repositories
  const studentRepository = new DrizzleStudentRepository(db);
  const guardianRepository = new DrizzleGuardianRepository(db);
  const enrollmentRepository = new DrizzleEnrollmentRepository(db);
  const publicEnrollmentRepository = new DrizzlePublicEnrollmentRepository(db);
  const planPriceLookup = new DrizzlePlanPriceLookup(db);
  const seatHoldRepository = new DrizzleSeatHoldRepository(db);
  const receiptUploadRepository = new DrizzleReceiptUploadRepository(db);
  const receiptScreeningRepository = new DrizzleReceiptScreeningRepository(db);
  const platformSettingsRepository = new DrizzlePlatformSettingsRepository(db);
  const userRoleRepository = new DrizzleUserRoleRepository(db);
  const auditLogRepository = new DrizzleAuditLogRepository(db);
  const staffInviteRepository = new DrizzleStaffInviteRepository(db);
  const staffAccessRepository = new DrizzleStaffAccessRepository(db);
  const staffAccountProvisioner = new BetterAuthStaffAccountProvisioner(auth, db);
  const staffUserLookup = new DrizzleStaffUserLookup(db);
  const staffPasswordResetRepository = new DrizzleStaffPasswordResetRepository(db);
  const staffPasswordSetter = new BetterAuthStaffPasswordSetter(db);
  const featureFlagOverrideRepository = new DrizzleFeatureFlagOverrideRepository(db);
  const catalogEntryRepository = new DrizzleCatalogEntryRepository(db);
  const courseRepository = new DrizzleCourseRepository(db);
  const planRepository = new DrizzlePlanRepository(db);
  const academicPeriodRepository = new DrizzleAcademicPeriodRepository(db);
  const classGroupRepository = new DrizzleClassGroupRepository(db);
  const waitlistRepository = new DrizzleWaitlistRepository(db);
  const enrollmentEmailContextLookup = new DrizzleEnrollmentEmailContextLookup(db);

  // Notifications
  const outboxRepository = new DrizzleOutboxRepository(db);
  const notificationProvider = createNotificationProvider(config, logger);

  // Storage (Tigris/S3-compatible — OOC-19)
  const s3Client = createS3Client(config);
  const receiptStorage = new TigrisReceiptStorage(s3Client, config.BUCKET_NAME);
  const receiptObjectStore = new ReceiptObjectStore(s3Client, config.BUCKET_NAME);

  // Use cases
  const registerStudent = new RegisterStudentUseCase(studentRepository, guardianRepository);
  const createManualEnrollment = new CreateManualEnrollmentUseCase(
    enrollmentRepository,
    planPriceLookup,
    enrollmentEmailContextLookup,
  );
  const submitPublicEnrollment = new SubmitPublicEnrollmentUseCase(
    publicEnrollmentRepository,
    seatHoldRepository,
    receiptUploadRepository,
  );
  const claimSeatHold = new ClaimSeatHoldUseCase(seatHoldRepository, platformSettingsRepository);
  const releaseSeatHold = new ReleaseSeatHoldUseCase(seatHoldRepository);
  const expireSeatHolds = new ExpireSeatHoldsUseCase(seatHoldRepository);
  const requestReceiptUpload = new RequestReceiptUploadUseCase(
    seatHoldRepository,
    receiptUploadRepository,
    receiptStorage,
    config.RECEIPT_MAX_UPLOAD_BYTES,
  );
  const confirmReceiptUpload = new ConfirmReceiptUploadUseCase(receiptUploadRepository, receiptStorage);
  const screenReceiptUpload = new ScreenReceiptUploadUseCase(receiptScreeningRepository);
  const promoteRole = new PromoteUserRoleUseCase(freshAuthVerifier, userRoleRepository, auditLogRepository);
  const createInvite = new CreateStaffInviteUseCase(staffUserLookup, staffInviteRepository, auditLogRepository);
  const renewInvite = new RenewStaffInviteUseCase(staffInviteRepository, auditLogRepository);
  const cancelInvite = new CancelStaffInviteUseCase(staffInviteRepository, auditLogRepository);
  const completeInvite = new CompleteStaffInviteUseCase(staffInviteRepository, staffAccountProvisioner, auditLogRepository);
  const removeAccess = new RemoveStaffAccessUseCase(staffAccessRepository, auditLogRepository);
  const restoreAccess = new RestoreStaffAccessUseCase(staffAccessRepository, auditLogRepository);
  const createPasswordReset = new CreateStaffPasswordResetUseCase(staffPasswordResetRepository, auditLogRepository);
  const renewPasswordReset = new RenewStaffPasswordResetUseCase(staffPasswordResetRepository);
  const cancelPasswordReset = new CancelStaffPasswordResetUseCase(staffPasswordResetRepository);
  const completePasswordReset = new CompleteStaffPasswordResetUseCase(
    staffPasswordResetRepository,
    staffPasswordSetter,
    auditLogRepository,
  );

  const setFeatureFlag = new SetFeatureFlagOverrideUseCase(featureFlagOverrideRepository, auditLogRepository);
  const updateCheckoutHoldMinutes = new UpdateCheckoutHoldMinutesUseCase(platformSettingsRepository, auditLogRepository);

  const retireCatalogEntry = new RetireCatalogEntryUseCase(catalogEntryRepository, auditLogRepository);
  const restoreCatalogEntry = new RestoreCatalogEntryUseCase(catalogEntryRepository, auditLogRepository);
  const createCourse = new CreateCourseUseCase(courseRepository, auditLogRepository);
  const updateCourse = new UpdateCourseUseCase(courseRepository, auditLogRepository);
  const createPlan = new CreatePlanUseCase(courseRepository, planRepository, auditLogRepository);
  const renamePlan = new RenamePlanUseCase(planRepository, auditLogRepository);
  const schedulePlanPrice = new SchedulePlanPriceUseCase(planRepository, auditLogRepository);
  const createPeriod = new CreateAcademicPeriodUseCase(academicPeriodRepository, auditLogRepository);
  const updatePeriod = new UpdateAcademicPeriodUseCase(academicPeriodRepository, auditLogRepository);
  const duplicatePeriod = new DuplicateClassGroupsUseCase(academicPeriodRepository, classGroupRepository, auditLogRepository);
  const createClassGroup = new CreateClassGroupUseCase(
    courseRepository,
    academicPeriodRepository,
    classGroupRepository,
    auditLogRepository,
  );
  const updateClassGroup = new UpdateClassGroupUseCase(courseRepository, classGroupRepository, auditLogRepository);
  const advanceClassGroupStatus = new AdvanceClassGroupStatusUseCase(classGroupRepository, auditLogRepository);
  const joinWaitlist = new JoinWaitlistUseCase(classGroupRepository, waitlistRepository, auditLogRepository);
  const leaveWaitlist = new LeaveWaitlistUseCase(waitlistRepository, auditLogRepository);

  // Queries (read-only, no domain invariant to protect — see class docs)
  const listStudents = new ListStudentsQuery(db);
  const getStudent = new GetStudentQuery(db);
  const listEnrollments = new ListEnrollmentsQuery(db);
  const listOpenClassGroups = new ListOpenClassGroupsQuery(db);
  const getPublicCatalog = new GetPublicCatalogQuery(db);
  const listCourses = new ListCoursesQuery(db);
  const getCourse = new GetCourseQuery(db);
  const listPeriods = new ListPeriodsQuery(db);
  const listClassGroups = new ListClassGroupsQuery(db);
  const listWaitlist = new ListWaitlistQuery(db);
  const listStaff = new ListStaffQuery(db);
  const listStaffRoleChanges = new ListStaffRoleChangesQuery(db);

  return {
    production: config.NODE_ENV === "production",
    config,
    logger,
    auth,
    db,
    identity: {
      currentSession,
      freshAuthVerifier,
      userRoleRepository,
      auditLogRepository,
      staffAccessRepository,
      staffAccountProvisioner,
      staffUserLookup,
      staffPasswordSetter,
    },
    notifications: {
      outbox: outboxRepository,
      provider: notificationProvider,
    },
    storage: {
      objectStore: receiptObjectStore,
    },
    repositories: {
      catalogEntry: catalogEntryRepository,
      course: courseRepository,
      academicPeriod: academicPeriodRepository,
      classGroup: classGroupRepository,
      waitlist: waitlistRepository,
      plan: planRepository,
      student: studentRepository,
      guardian: guardianRepository,
      enrollment: enrollmentRepository,
      publicEnrollment: publicEnrollmentRepository,
      seatHold: seatHoldRepository,
      receiptUpload: receiptUploadRepository,
      planPriceLookup,
      staffInvite: staffInviteRepository,
      staffPasswordReset: staffPasswordResetRepository,
      featureFlagOverride: featureFlagOverrideRepository,
      platformSettings: platformSettingsRepository,
    },
    useCases: {
      student: {
        register: registerStudent,
      },
      enrollment: {
        createManual: createManualEnrollment,
        submitPublic: submitPublicEnrollment,
        claimSeatHold,
        releaseSeatHold,
        expireSeatHolds,
        requestReceiptUpload,
        confirmReceiptUpload,
        screenReceiptUpload,
      },
      staff: {
        promoteRole,
        createInvite,
        renewInvite,
        cancelInvite,
        completeInvite,
        removeAccess,
        restoreAccess,
        createPasswordReset,
        renewPasswordReset,
        cancelPasswordReset,
        completePasswordReset,
      },
      platform: {
        setFeatureFlag,
        updateCheckoutHoldMinutes,
      },
      catalog: {
        retire: retireCatalogEntry,
        restore: restoreCatalogEntry,
        createCourse,
        updateCourse,
        createPlan,
        renamePlan,
        schedulePlanPrice,
        createPeriod,
        updatePeriod,
        duplicatePeriod,
        createClassGroup,
        updateClassGroup,
        advanceClassGroupStatus,
        joinWaitlist,
        leaveWaitlist,
      },
    },
    queries: {
      listStudents,
      getStudent,
      listEnrollments,
      listOpenClassGroups,
      getPublicCatalog,
      listCourses,
      getCourse,
      listPeriods,
      listClassGroups,
      listWaitlist,
      listStaff,
      listStaffRoleChanges,
    },
  };
}

export const container = buildContainer();
