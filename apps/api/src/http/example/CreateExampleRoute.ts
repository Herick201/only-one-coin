import { CreateExampleSchema, ExamplePropsSchema } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

export const createExampleRoute = RouteBuilder.post("/examples")
  .docs({
    tags: ["Examples"],
    summary: "Create a new example",
    description: "Creates a new example with the provided data.",
  })
  .body(CreateExampleSchema)
  .response(201, ExamplePropsSchema)
  .response(400, ErrorResponseSchema)
  .response(500, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const example = await container.useCases.example.create.run(request.body);
    reply.status(201).send(example);
  });
