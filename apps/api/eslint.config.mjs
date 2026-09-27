import tseslint from "typescript-eslint";
import { baseTypeScriptConfig } from "../../eslint.base.mjs";

export default baseTypeScriptConfig(tseslint, import.meta.dirname, [], [
  "auth.ts",
  "vitest.config.ts",
  "vitest.integration.config.ts",
]);
