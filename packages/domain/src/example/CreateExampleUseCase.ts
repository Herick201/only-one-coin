import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { CreateExampleDTO, Example } from "./Example.js";
import type { IExampleRepository } from "./ExampleRepository.js";

export class CreateExampleUseCase extends BaseUseCase<CreateExampleDTO, Example> {
  constructor(private readonly exampleRepository: IExampleRepository) {
    super();
  }

  async run(input: CreateExampleDTO): Promise<Example> {
    const example = Example.create(input);
    return this.exampleRepository.create(example);
  }
}
