/**
 * Prints, one per line, every variable the API refuses to boot without — the
 * keys of `ConfigSchema` with no default and not optional. The deploy
 * workflow compares this against `fly secrets list` and stops before the
 * backup, the migration and the deploy when one is missing: a release that
 * cannot boot crash-loops until Fly gives up and leaves the machine stopped,
 * and setting the secret afterwards does not start it again (03/10/2026,
 * TURNSTILE_SECRET_KEY).
 *
 * Reads the schema, never the environment — it runs where no secret exists.
 * Conditional requirements (EMAIL_SENDER_ADDRESS when BREVO_API_KEY is set)
 * are not covered.
 */
import { ConfigSchema } from "../config.js";

const shape = ConfigSchema.innerType().shape;

for (const [name, schema] of Object.entries(shape)) {
  if (!schema.isOptional()) {
    console.log(name);
  }
}
