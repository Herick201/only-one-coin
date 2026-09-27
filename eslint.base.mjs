// Shared flat-config building block for every app/package's own eslint.config.mjs.
// Not a workspace package on purpose (packages/shared doesn't exist yet, CLAUDE.md §3) —
// plain relative import. Takes `tseslint` as a parameter instead of importing it itself,
// so resolution always uses the caller's own local "typescript-eslint" devDependency
// (pnpm doesn't hoist across workspace packages here) rather than a root-only install.

/**
 * @param {typeof import("typescript-eslint")} tseslint
 * @param {string} tsconfigRootDir - import.meta.dirname of the calling eslint.config.mjs
 * @param {string[]} [ignores]
 * @param {string[]} [allowDefaultProject] - glob(s) for TS files that exist
 *   outside the package's own tsconfig "include" (ex.: config de raiz do
 *   pacote, tipo `vitest.config.ts`) — sem isso o projectService recusa
 *   parsear o arquivo por completo, não só pular as regras tipadas.
 */
export function baseTypeScriptConfig(tseslint, tsconfigRootDir, ignores = [], allowDefaultProject = []) {
  return tseslint.config(
    {
      // O próprio eslint.config.mjs não entra no tsconfig do pacote (não é
      // código-fonte), então o projectService nunca o acha — precisa ficar
      // fora do type-checked linting, não só do build.
      ignores: ["dist/**", "node_modules/**", "coverage/**", "eslint.config.mjs", ...ignores],
    },
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        parserOptions: {
          projectService: { allowDefaultProject },
          tsconfigRootDir,
        },
      },
      rules: {
        // Portão de CI item 4 (CLAUDE.md §6) — promise sem tratamento.
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
        // Padrão comum no repo pra omitir chave via destructuring
        // (`const { key: _drop, ...rest } = obj`) — sem isso o "recommended"
        // acusa a variável descartada como não usada.
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
        ],
      },
    },
  );
}
