import type { FastifyBaseLogger } from "fastify";
import {
  CreateManualEnrollmentUseCase,
  RegisterStudentUseCase,
  SubmitPublicEnrollmentUseCase,
  type ICurrentSessionPort,
  type IEnrollmentRepository,
  type IGuardianRepository,
  type IPlanPriceLookup,
  type IPublicEnrollmentRepository,
  type IStudentRepository,
} from "@ooc/domain";
import { loadConfig, type Config } from "./config.js";
import { createLogger } from "./infra/logger.js";
import { createAuth, type Auth } from "./infra/auth/betterAuth.js";
import { BetterAuthCurrentSessionPort } from "./infra/identity/BetterAuthCurrentSessionPort.js";
import { createDb, type Db } from "./infra/db/client.js";
import { DrizzleStudentRepository } from "./infra/persistence/student/DrizzleStudentRepository.js";
import { DrizzleGuardianRepository } from "./infra/persistence/student/DrizzleGuardianRepository.js";
import { DrizzleEnrollmentRepository } from "./infra/persistence/enrollment/DrizzleEnrollmentRepository.js";
import { DrizzlePublicEnrollmentRepository } from "./infra/persistence/enrollment/DrizzlePublicEnrollmentRepository.js";
import { DrizzlePlanPriceLookup } from "./infra/persistence/enrollment/DrizzlePlanPriceLookup.js";
import { ListStudentsQuery } from "./infra/persistence/student/ListStudentsQuery.js";
import { GetStudentQuery } from "./infra/persistence/student/GetStudentQuery.js";
import { ListOpenClassGroupsQuery } from "./infra/persistence/catalog/ListOpenClassGroupsQuery.js";
import { GetPublicCatalogQuery } from "./infra/persistence/catalog/GetPublicCatalogQuery.js";

export interface AppRepositories {
  student: IStudentRepository;
  guardian: IGuardianRepository;
  enrollment: IEnrollmentRepository;
  publicEnrollment: IPublicEnrollmentRepository;
  planPriceLookup: IPlanPriceLookup;
}

export interface AppUseCases {
  student: {
    register: RegisterStudentUseCase;
  };
  enrollment: {
    createManual: CreateManualEnrollmentUseCase;
    submitPublic: SubmitPublicEnrollmentUseCase;
  };
}

export interface AppQueries {
  listStudents: ListStudentsQuery;
  getStudent: GetStudentQuery;
  listOpenClassGroups: ListOpenClassGroupsQuery;
  getPublicCatalog: GetPublicCatalogQuery;
}

export interface AppIdentity {
  currentSession: ICurrentSessionPort;
}

export interface AppContainer {
  production: boolean;
  config: Config;
  logger: FastifyBaseLogger;
  auth: Auth;
  db: Db;
  identity: AppIdentity;
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

  // Repositories
  const studentRepository = new DrizzleStudentRepository(db);
  const guardianRepository = new DrizzleGuardianRepository(db);
  const enrollmentRepository = new DrizzleEnrollmentRepository(db);
  const publicEnrollmentRepository = new DrizzlePublicEnrollmentRepository(db);
  const planPriceLookup = new DrizzlePlanPriceLookup(db);

  // Use cases
  const registerStudent = new RegisterStudentUseCase(studentRepository, guardianRepository);
  const createManualEnrollment = new CreateManualEnrollmentUseCase(enrollmentRepository, planPriceLookup);
  const submitPublicEnrollment = new SubmitPublicEnrollmentUseCase(publicEnrollmentRepository);

  // Queries (read-only, no domain invariant to protect — see class docs)
  const listStudents = new ListStudentsQuery(db);
  const getStudent = new GetStudentQuery(db);
  const listOpenClassGroups = new ListOpenClassGroupsQuery(db);
  const getPublicCatalog = new GetPublicCatalogQuery(db);

  return {
    production: config.NODE_ENV === "production",
    config,
    logger,
    auth,
    db,
    identity: {
      currentSession,
    },
    repositories: {
      student: studentRepository,
      guardian: guardianRepository,
      enrollment: enrollmentRepository,
      publicEnrollment: publicEnrollmentRepository,
      planPriceLookup,
    },
    useCases: {
      student: {
        register: registerStudent,
      },
      enrollment: {
        createManual: createManualEnrollment,
        submitPublic: submitPublicEnrollment,
      },
    },
    queries: {
      listStudents,
      getStudent,
      listOpenClassGroups,
      getPublicCatalog,
    },
  };
}

export const container = buildContainer();
