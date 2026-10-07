import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./isUniqueViolation.js";

describe("isUniqueViolation", () => {
  const pgError = { code: "23505", constraint: "user_email_key" };

  it("finds the pg code on the error or on its cause chain", () => {
    expect(isUniqueViolation(pgError)).toBe(true);
    expect(isUniqueViolation(new Error("Failed query", { cause: pgError }))).toBe(true);
  });

  it("matches a named constraint only when it is the one violated", () => {
    expect(isUniqueViolation(new Error("Failed query", { cause: pgError }), "user_email_key")).toBe(true);
    expect(isUniqueViolation(pgError, "portal_access_tokens_token_hash_key")).toBe(false);
  });

  it("is false for anything else", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
