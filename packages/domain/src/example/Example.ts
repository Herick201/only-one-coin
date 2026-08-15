// TODO: switch to native crypto.randomUUIDv7() once engines.node requires >=26 (LTS ~out/2026)
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { BaseModel } from "../shared/base/BaseModel.js";

export const ExamplePropsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export const CreateExampleSchema = ExamplePropsSchema.omit({ id: true });

export type ExampleProps = z.infer<typeof ExamplePropsSchema>;
export type CreateExampleDTO = z.infer<typeof CreateExampleSchema>;

export class Example extends BaseModel {
  public name: string;

  constructor(props: ExampleProps) {
    super(props.id);
    this.name = props.name;
  }

  static create(dto: CreateExampleDTO): Example {
    const result = CreateExampleSchema.safeParse(dto);

    if (!result.success) {
      throw new Error("Invalid data");
    }

    return new Example({
      id: uuid(),
      ...result.data,
    });
  }
}
