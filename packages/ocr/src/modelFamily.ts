/**
 * The model family of an OpenRouter id (`vendor/model[:variant]`), as the
 * vendor prefix: `google/gemini-3.1-flash-lite` → `google`.
 *
 * Level 2 of the OCR ladder must be "um modelo de outra família"
 * (apps/api/CLAUDE.md): the whole point of the second reading is an
 * independent error pattern, and two models from the same vendor share
 * training data and failure modes. The vendor is the coarsest family there
 * is — stricter than "another model line", on purpose. `null` for an id with
 * no vendor prefix, which then cannot be shown to differ from anything.
 */
export function modelFamily(model: string): string | null {
  const slash = model.indexOf("/");
  return slash > 0 ? model.slice(0, slash).toLowerCase() : null;
}
