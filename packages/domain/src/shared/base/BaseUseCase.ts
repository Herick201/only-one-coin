export abstract class BaseUseCase<TInput, TOutput> {
  abstract run(input: TInput): Promise<TOutput>;
}
