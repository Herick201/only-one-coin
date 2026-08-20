import type { FastifyBaseLogger } from "fastify";
import { CreateExampleUseCase, type ICurrentSessionPort, type IExampleRepository } from "@ooc/domain";
import { loadConfig, type Config } from "./config.js";
import { createLogger } from "./infra/logger.js";
import { InMemoryExampleRepository } from "./infra/persistence/example/InMemoryExampleRepository.js";
import { createAuth, type Auth } from "./infra/auth/betterAuth.js";
import { BetterAuthCurrentSessionPort } from "./infra/identity/BetterAuthCurrentSessionPort.js";

export interface AppRepositories {
  example: IExampleRepository;
}

export interface AppUseCases {
  example: {
    create: CreateExampleUseCase;
  };
}

export interface AppIdentity {
  currentSession: ICurrentSessionPort;
}

export interface AppContainer {
  production: boolean;
  config: Config;
  logger: FastifyBaseLogger;
  auth: Auth;
  identity: AppIdentity;
  repositories: AppRepositories;
  useCases: AppUseCases;
}

function buildContainer(): AppContainer {
  const config = loadConfig();
  const logger = createLogger(config);

  // Auth
  const auth = createAuth(config);
  const currentSession = new BetterAuthCurrentSessionPort(auth);

  // Repositories
  const exampleRepository = new InMemoryExampleRepository();

  // Use cases
  const createExample = new CreateExampleUseCase(exampleRepository);

  return {
    production: config.NODE_ENV === "production",
    config,
    logger,
    auth,
    identity: {
      currentSession,
    },
    repositories: {
      example: exampleRepository,
    },
    useCases: {
      example: {
        create: createExample,
      },
    },
  };
}

export const container = buildContainer();
