import type { FastifyBaseLogger } from "fastify";
import {
  CreateManualEnrollmentUseCase,
  RegisterStudentUseCase,
  type ICurrentSessionPort,
  type IEnrollmentRepository,
  type IGuardianRepository,
  type IPlanPriceLookup,
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
import { DrizzlePlanPriceLookup } from "./infra/persistence/enrollment/DrizzlePlanPriceLookup.js";
import { SearchStudentsQuery } from "./infra/persistence/student/SearchStudentsQuery.js";
import { ListOpenClassGroupsQuery } from "./infra/persistence/catalog/ListOpenClassGroupsQuery.js";

export interface AppRepositories {
  student: IStudentRepository;
  guardian: IGuardianRepository;
  enrollment: IEnrollmentRepository;
  planPriceLookup: IPlanPriceLookup;
}

export interface AppUseCases {
  student: {
    register: RegisterStudentUseCase;
  };
  enrollment: {
    createManual: CreateManualEnrollmentUseCase;
  };
}

export interface AppQueries {
  searchStudents: SearchStudentsQuery;
  listOpenClassGroups: ListOpenClassGroupsQuery;
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
  const planPriceLookup = new DrizzlePlanPriceLookup(db);

  // Use cases
  const registerStudent = new RegisterStudentUseCase(studentRepository, guardianRepository);
  const createManualEnrollment = new CreateManualEnrollmentUseCase(enrollmentRepository, planPriceLookup);

  // Queries (read-only, no domain invariant to protect — see class docs)
  const searchStudents = new SearchStudentsQuery(db);
  const listOpenClassGroups = new ListOpenClassGroupsQuery(db);

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
      planPriceLookup,
    },
    useCases: {
      student: {
        register: registerStudent,
      },
      enrollment: {
        createManual: createManualEnrollment,
      },
    },
    queries: {
      searchStudents,
      listOpenClassGroups,
    },
  };
}

export const container = buildContainer();
