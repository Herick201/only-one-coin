import i18next from "eslint-plugin-i18next";
import * as astroParser from "astro-eslint-parser";
import tseslint from "typescript-eslint";
import { baseTypeScriptConfig } from "../../eslint.base.mjs";

export default tseslint.config(
  ...baseTypeScriptConfig(tseslint, import.meta.dirname, ["dist/**", ".astro/**"]),
  {
    // O frontmatter de um .astro é TS de verdade, só que astro-eslint-parser
    // precisa expor essa parte pro @typescript-eslint/parser por baixo —
    // sem isso o bloco `---...---` nem chega a ser um Program válido pras
    // regras tipadas (no-floating-promises incluída).
    files: ["**/*.astro"],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".astro"],
        // astro-eslint-parser doesn't understand projectService yet — falls
        // back to (and warns about) `project: true`, so set that directly
        // and explicitly cancel the base config's `projectService: true`
        // (parserOptions merges across cascading configs, it doesn't
        // replace outright).
        projectService: false,
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Portão de CI item 4 (CLAUDE.md §6/§4) — string de UI fora do locale.
    //
    // .astro FICA DE FORA desta regra — pendência conhecida, não coberta
    // fingida. astro-eslint-parser expõe frontmatter *e* o template do
    // mesmo jeito genérico (todo atributo HTML/SVG e toda string vira
    // Literal), e o plugin só tem lista de atributos "estruturais" curada
    // pra React (`jsx-attributes`) — não existe equivalente pra Astro.
    // Testado com mode "all" nesta sessão: 175 achados, quase todos ruído
    // estrutural (`class="section-title"`, `sizes=`, `format="webp"`, SVG
    // bruto, token `.replace("{years}", ...)`, chave de JSON-LD) — exigiria
    // uma allowlist grande e arriscada de acertar sem auditoria própria.
    // Cobrir o texto do template do Astro é follow-up (issue própria), não
    // algo pra inventar às pressas aqui.
    //
    // Nos .ts puros (fora de `src/i18n/**`, que É o locale — `org` em
    // `ui.ts`, CLAUDE.md raiz §1) mode "all" funciona normalmente: pouco
    // código, sem ruído estrutural de template.
    files: ["src/**/*.ts"],
    ignores: ["src/i18n/**"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": ["error", { mode: "all" }],
    },
  },
);
