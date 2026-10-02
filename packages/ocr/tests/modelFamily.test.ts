import { describe, expect, it } from "vitest";
import { modelFamily } from "../src/modelFamily.js";

describe("modelFamily", () => {
  it.each([
    ["google/gemini-3.1-flash-lite", "google"],
    ["google/gemini-3.5-flash-lite:batch", "google"],
    ["Anthropic/claude-haiku-4.5", "anthropic"],
    ["openai/gpt-5-mini", "openai"],
  ])("%s → %s", (model, family) => {
    expect(modelFamily(model)).toBe(family);
  });

  it.each(["gemini-3.1-flash-lite", "/gemini", ""])("%j has no family", (model) => {
    expect(modelFamily(model)).toBeNull();
  });
});
