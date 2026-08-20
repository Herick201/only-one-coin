import type { FastifyBaseLogger } from "fastify";
import { CreateExampleUseCase, type IExampleRepository } from "@ooc/domain";
import { loadConfig, type Config } from "./config.js";
import { createLogger } from "./infra/logger.js";
import { InMemoryExampleRepository } from "./infra/persistence/example/InMemoryExampleRepository.js";

export interface AppRepositories {
  example: IExampleRepository;
}

export interface AppUseCases {
  example: {
    create: CreateExampleUseCase;
  };
}

export interface AppContainer {
  production: boolean;
  config: Config;
  logger: FastifyBaseLogger;
  repositories: AppRepositories;
  useCases: AppUseCases;
}

function buildContainer(): AppContainer {
  const config = loadConfig();
  const logger = createLogger(config);

  // Repositories
  const exampleRepository = new InMemoryExampleRepository();

  // Use cases
  const createExample = new CreateExampleUseCase(exampleRepository);

  return {
    production: config.NODE_ENV === "production",
    config,
    logger,
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
