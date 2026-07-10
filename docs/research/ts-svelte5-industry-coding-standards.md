# TypeScript + Svelte 5 Industry Coding Standards — Primary-Source Audit

**Date:** 2026-07-09
**Method:** primary-source repo audit (ESLint/Prettier/tsconfig/CONTRIBUTING/CI configs fetched directly from GitHub)
**Status:** Research complete. No implementation. Feeds decisions on CONTRIBUTING.md / docs/architecture/code-standards.md revisions.

---

## 0. This repo's current state (grounding fact, verified this session)

Checked `/Users/jiri.grill/Developer/eczema-helper` directly on 2026-07-09:

- `ls eslint.config.* .eslintrc* .prettierrc* prettier.config*` → **no matches**. No ESLint config file and no Prettier config file exist anywhere in the repo.
- `package.json` **does** define:
  - `"lint": "eslint ."` (line 11)
  - `"format": "prettier --write ."` (line 12)
  - devDependencies: `eslint@^9.39.4`, `eslint-config-prettier@^10.1.8`, `eslint-plugin-svelte@^2.46.1`, `prettier@^3.8.3`, `prettier-plugin-svelte@^3.5.2`

So this repo has the tooling wired up (scripts + deps) but **no actual rule configuration** — ESLint 9 requires a flat `eslint.config.js` to do anything at all; with none present, `eslint .` either errors immediately ("ESLint couldn't find a configuration file") or lints nothing depending on invocation. `prettier --write .` with no config file falls back to Prettier's bare defaults (double quotes, no Svelte-aware formatting despite `prettier-plugin-svelte` being installed but never loaded, since only a config file's `"plugins"` array activates a Prettier plugin). This mismatch between installed tooling and absent configuration is the single biggest concrete gap found in this audit — see §"Concrete gaps worth closing".

---

## 1. sveltejs/kit (SvelteKit)

Repo: `sveltejs/kit`, default branch `main`.

### ESLint
- Root `eslint.config.js` (flat config) imports the shared **`@sveltejs/eslint-config`** package rather than defining rules locally (`sveltejs/kit@main:eslint.config.js`):
  ```js
  import svelte_config from '@sveltejs/eslint-config';
  export default [
    ...svelte_config,
    { rules: { 'no-undef': 'off', 'svelte/prefer-svelte-reactivity': 'off' } },
    // + kit-local custom rule 'no-runtime-to-exports-imports' restricted to packages/kit/src/runtime
    // + typed-lint block with parserOptions.projectService: true enabling:
    //   '@typescript-eslint/await-thenable': 'error'
    //   '@typescript-eslint/require-await': 'error'
    //   '@typescript-eslint/no-floating-promises': 'error'
  ];
  ```
- The shared `@sveltejs/eslint-config` package (`sveltejs/eslint-config@main:index.js`) composes: `@eslint/js` recommended → `typescript-eslint` recommended → `eslint-plugin-svelte` recommended → `eslint-config-prettier` → `svelte.configs.prettier` (turns off stylistic rules that conflict with Prettier) → a custom rules block. Notable custom choices:
  - `'@typescript-eslint/no-explicit-any': 'off'` — kit's shared config explicitly **allows `any`** (contradicts a common "TS projects always ban any" assumption).
  - `'@typescript-eslint/explicit-function-return-type': 'off'`, `'@typescript-eslint/explicit-module-boundary-types': 'off'` — no explicit return-type enforcement via lint.
  - `'no-restricted-properties': [{ object: 'test', property: 'only', message: 'Do not check in test.only tests.' }]` — blocks committing `test.only`.
  - `'n/prefer-node-protocol': 'error'`, `'n/prefer-global/process': ['error', 'never']` — via `eslint-plugin-n`.
  - `'@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }]` — single quotes enforced at lint time (belt-and-suspenders alongside Prettier).
- Flat config only; no legacy `.eslintrc` anywhere in the repo.

### Prettier
`sveltejs/kit@main:.prettierrc`:
```json
{
  "useTabs": true,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [
    { "files": ["*.svelte"], "options": { "bracketSameLine": false } }
  ]
}
```
- Tabs, single quotes, **no trailing commas**, 100-char width. Only `prettier-plugin-svelte` — no Tailwind plugin (kit itself ships no Tailwind CSS).

### TypeScript strictness
`sveltejs/kit@main:packages/kit/tsconfig.json`:
```json
{
  "compilerOptions": {
    "allowJs": true, "checkJs": true, "noEmit": true,
    "strict": true,
    "target": "es2023",
    "module": "node16", "moduleResolution": "node16",
    "allowSyntheticDefaultImports": true,
    "noUnusedLocals": true, "noUnusedParameters": true,
    "types": ["node"]
  }
}
```
- `strict: true` plus `noUnusedLocals`/`noUnusedParameters`, but **no** `noUncheckedIndexedAccess`, **no** `exactOptionalPropertyTypes`, **no** `verbatimModuleSyntax`, **no** `skipLibCheck` set here. Kit itself is largely written in JS with JSDoc types (`allowJs`/`checkJs`) rather than idiomatic strict-TS-app style — kit is not the most representative example for "strict TS app" comparisons on this axis; bits-ui/shadcn-svelte/skeleton-svelte (below) are far stricter.

### CONTRIBUTING / process
`sveltejs/kit@main:CONTRIBUTING.md`:
- Monorepo via pnpm; a playground app for manual testing; PR builds testable via `pkg.pr.new`.
- **Coding style section verbatim:** "Internal variables are written with `snake_case` while external APIs are written with `camelCase`" — an unusual explicit naming split not seen elsewhere in this survey.
- "Ensure `pnpm lint` and `pnpm check` pass. You can run `pnpm format` to format the code." Optional git hook, not enforced by default: `git config core.hookspath .githooks`.
- **Changesets**: "For changes to be reflected in package changelogs, run `pnpm changeset` and follow the prompts." Config (`sveltejs/kit@main:.changeset/config.json`) uses `@changesets/changelog-github`, `"baseBranch": "main"`.
- PR template (`sveltejs/kit@main:.github/PULL_REQUEST_TEMPLATE.md`) requires: `closes #...`, a checklist item to run `pnpm test`, `pnpm lint`, `pnpm check`, and a dedicated **Changesets** checklist item: "generate a changeset by running `pnpm changeset`... Please prefix changeset messages with `feat:`, `fix:`, or `chore:`." Also references `sveltejs/rfcs` for large design changes: "For large changes, please create an RFC."
- CI (`sveltejs/kit@main:.github/workflows/ci.yml`): a `lint-all` job runs `pnpm run lint`, regenerates and diffs published types (`prepublishOnly`), then `pnpm run check`; separate large test matrices (Node 18/20/22/24 × chromium/firefox/webkit) run via `pnpm test:kit`. Lint and type-check gate merges; there is no coverage-threshold step anywhere in `ci.yml`.

### Testing
- Playwright is the primary test tool (browser/e2e-heavy, appropriate for a framework). No Vitest coverage-threshold gate found in `ci.yml`.

### Svelte 5 idioms
- No bespoke "runes-only" ESLint rule found; relies on `eslint-plugin-svelte` recommended set plus the shared-config overrides above.

### Beyond the linter
- No standalone style-guide doc beyond `CONTRIBUTING.md`'s short "Coding style" section. Large design changes are pushed out to the separate `sveltejs/rfcs` repo rather than an in-repo ADR folder.

---

## 2. huntabyte/bits-ui

Repo: `huntabyte/bits-ui`, default branch `main` (confirmed: `default_branch: "main"` via GitHub API).

### ESLint
`bits-ui@main:eslint.config.js` — flat config, **dual-linter setup**: full typed ESLint *plus* **oxlint** (Rust-based linter) chained together:
```js
import oxlint from "eslint-plugin-oxlint";
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: { parserOptions: { extraFileExtensions: [".svelte"], parser: tseslint.parser } },
    rules: { "svelte/no-navigation-without-resolve": "off" } },
  { rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "prefer-const": "off",
      "svelte/no-at-html-tags": "off",
      "svelte/prefer-svelte-reactivity": "off",
  }},
  ...oxlint.configs["flat/recommended"],
  ...oxlint.buildFromOxlintConfigFile("./.oxlintrc.json")
);
```
- Separate `bits-ui@main:.oxlintrc.json` enables `"plugins": ["typescript", "unicorn"]`, turns the whole `"correctness"` category off (deferred to typescript-eslint/tsc instead), and hand-lists dozens of individual `no-*` rules plus TS-specific ones — notably `"@typescript-eslint/no-explicit-any": "error"` (the **opposite** of kit's `off`), plus a path-scoped override restricting `"no-console": "error"` to `"packages/bits-ui/src/lib/**/*"` only (shipped library source held to a stricter bar than docs/tests).
- `package.json` script: `"lint": "oxlint . && eslint ."` — oxlint (fast Rust linter) runs first as a pre-filter, then full ESLint.
- Uses **`typescript-eslint@^8`** unified package (not the older split `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` naming), flat-config only, no legacy `.eslintrc`.

### Prettier
`bits-ui@main:.prettierrc`:
```json
{
  "useTabs": true, "tabWidth": 4, "singleQuote": false, "trailingComma": "es5",
  "semi": true, "printWidth": 100,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [
    { "files": "*.svelte", "options": { "parser": "svelte" } },
    { "files": "*.md", "options": { "tabWidth": 2, "useTabs": false, "printWidth": 79 } }
  ],
  "tailwindFunctions": ["clsx", "cn", "tv"]
}
```
- **Plugin order confirmed load-bearing**: `prettier-plugin-svelte` listed *before* `prettier-plugin-tailwindcss` — matches the documented Tailwind-plugin requirement that the class-sorting plugin run last in the plugin array so it sees fully-resolved template output.
- Double quotes (not single), semicolons on, 4-space tab width, `es5` trailing commas — a materially different formatting profile from kit's tabs/single-quote/no-trailing-comma choice; there is no single industry-wide Prettier profile.
- `tailwindFunctions` extended to `clsx`, `cn`, `tv` (tailwind-variants) so class-string sorting also reaches utility-function call sites, not just template `class=` attributes.

### TypeScript strictness
`bits-ui@main:packages/bits-ui/tsconfig.json`:
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true, "checkJs": true, "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true, "resolveJsonModule": true,
    "skipLibCheck": true, "sourceMap": true, "strict": true,
    "moduleResolution": "NodeNext", "module": "NodeNext",
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "erasableSyntaxOnly": true
  }
}
```
- The **strictest tsconfig found in this whole survey**: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `skipLibCheck`, plus TS 5.8+'s `erasableSyntaxOnly` (rejects syntax that needs runtime transformation, e.g. enums/parameter properties — pairs naturally with Node's native `--experimental-strip-types`). No `exactOptionalPropertyTypes` found.

### CONTRIBUTING / process
`bits-ui@main:CONTRIBUTING.md`:
- Explicit branch-naming convention: `fix/button-hover-bug`, `feat/add-accordion-component`; **forbids PRs from `main`**: "Never submit a PR from your `main` branch."
- Commit messages: "we don't strictly enforce Conventional Commits... strive for concise and informative commit messages." But the **PR title** must be prefixed `feat:`/`fix:`/`docs:`/`chore:` — Conventional-Commits-style enforced only at the PR-title level, matching this repo's own scope-prefix convention.
- "Small, Focused PRs... One Branch Per Feature."
- Style enforcement is linter-driven, not prose-driven: "We use ESLint and Prettier to enforce a consistent coding style... run `pnpm lint`... `pnpm format`." Only prose rules beyond that: camelCase vars/functions, PascalCase components.
- Uses changesets (`.changeset/` dir present; devDependencies include `@changesets/cli` and `@svitejs/changesets-changelog-github-compact` for a compact GitHub changelog format); `"ci:publish": "pnpm build:packages && changeset publish"`.
- Workflow list (`bits-ui@main:.github/workflows/`) includes a dedicated `pr-guard.yml` and `bundle-analysis.yml` — bundle-size regression checking is a first-class CI concern for a component library (not present in kit).

### Testing
- `package.json` scripts split `"test"` (unit tests via a `tests` pnpm workspace package) from `"test:browser"` (Playwright-driven real-browser tests, with a `test:browser:chromium` variant) — an explicit unit vs. browser-integration split.
- `vite.config.ts` (`bits-ui@main:packages/bits-ui/vite.config.ts`) runs Vitest with `environment: "jsdom"` and a custom Vite plugin that force-prepends `"browser"` to Vite's resolve conditions under `process.env.VITEST`, plus `includeSource` for in-source tests.

### Svelte 5 idioms
- No bespoke ESLint rule enforcing runes; relies on `eslint-plugin-svelte` recommended set. The `.oxlintrc.json` scoped `no-console: error` restricted to `packages/bits-ui/src/lib/**/*` is the closest thing to a "library code held to a higher bar than docs/tests" rule.

### Beyond the linter
- No ADR-equivalent found in-repo; design discussion is pushed to GitHub Discussions per CONTRIBUTING ("Start a Discussion... Do not open an issue" for features), with a published policy page linked externally (`bits-ui.com/docs/policies/issues-and-feature-requests`) rather than kept as a file in the repo.

---

## 3. Melt UI

The originally-requested `melt-ui/melt` does not exist under that exact name; the GitHub org is `melt-ui` and its builder-pattern repo is named **`melt-ui/melt-ui`** (default branch `develop`, last pushed 2025-09-30, not archived — still technically alive but effectively legacy). The active, Svelte-5-runes rewrite (no builder functions) lives in a sibling repo, **`melt-ui/next-gen`** (default branch `main`, description "The next generation of Melt UI", most recently pushed 2026-03-04 — the freshest activity of the two). Per the task's fallback instruction, this section audits **`melt-ui/next-gen`** and flags where it differs from the older repo.

### ESLint
`melt-ui/next-gen@main:eslint.config.js` — flat config, notable because this is a **mixed Astro (docs site) + Svelte (library) monorepo**, so `eslint-plugin-astro` is layered in alongside the Svelte stack:
```js
import eslintPluginAstro from "eslint-plugin-astro";
import svelteConfig from "./packages/melt/svelte.config.js";
export default [
  js.configs.recommended,
  ...ts.config(...ts.configs.recommended, {
    rules: {
      "@typescript-eslint/no-unused-vars": [ "error", { args: "all", argsIgnorePattern: "^_", caughtErrors: "all", caughtErrorsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true } ],
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  }),
  ...svelte.configs["flat/recommended"],
  prettier,
  ...svelte.configs["flat/prettier"],
  { rules: { "svelte/require-each-key": "off" } },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: { parserOptions: { projectService: true, extraFileExtensions: [".svelte"], parser: ts.parser, svelteConfig } } },
  { ignores: ["build/", "**/dist/", "**/.svelte-kit/"] },
  ...eslintPluginAstro.configs.recommended,
];
```
- Same `no-explicit-any: off` stance as kit; explicitly imports and passes `svelteConfig` into `parserOptions` (recommended by `eslint-plugin-svelte` for better rule accuracy — most other repos in this survey skip this step).

### Prettier
`melt-ui/next-gen@main:.prettierrc`:
```json
{
  "arrowParens": "always",
  "useTabs": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [
    { "files": "*.svelte", "options": { "parser": "svelte" } },
    { "files": "*.astro", "options": { "parser": "astro" } }
  ]
}
```
- Tailwind plugin again listed **last** in the plugin array (consistent with bits-ui). `trailingComma: "all"` — a third distinct trailing-comma stance versus kit's `"none"` and bits-ui's `"es5"`.

### TypeScript strictness
Two tsconfigs exist: a loose root one (mixing Astro/icon typings, `strict: true` but no extra flags) and the actually-relevant library one, `melt-ui/next-gen@main:packages/melt/tsconfig.json`:
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"], "target": "es2022",
    "resolveJsonModule": true, "allowJs": true, "checkJs": true,
    "strict": true, "noUncheckedIndexedAccess": true,
    "sourceMap": true, "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true, "skipLibCheck": true,
    "strictNullChecks": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```
- `strict` + `noUncheckedIndexedAccess`, no `verbatimModuleSyntax` here (unlike bits-ui/shadcn-svelte/skeleton-svelte).

### CONTRIBUTING / process
`melt-ui/next-gen@main:CONTRIBUTING.md` is the most philosophically opinionated CONTRIBUTING file found in this survey — it opens with a **"Heuristics"** section (verbatim):
> - Priority is the best User Experience
> - Complexity should be introduced when it's inevitable
> - Code should be easy to reason about
> - Code should be easy to delete
> - Avoid abstracting too early
> - Avoid thinking too far in the future

This is design philosophy prose, not linter-enforceable, but it's an explicit written decision-making heuristic absent from every other project surveyed. The document also directs contributors to `git checkout develop` / `git pull upstream develop` as the base branch for forks (i.e. contribution workflow branches off `develop` even though the GitHub API reports `main` as the repo's technical default branch — a real discrepancy worth flagging rather than smoothing over). PR guidance: "A good PR is small, focuses on a single feature... Try not to include more than one issue in a single PR." Before submitting: "run `pnpm run lint` && `pnpm run check`." No changeset checklist item appears in this CONTRIBUTING text even though a `.changeset/` directory exists at repo root (changesets are added by maintainers, not required from contributors — same convention runed and skeleton use, see below).

### Testing
- `packages/melt/package.json` scripts show a `dev`/`browser`/`sync`/`watch` split typical of a `svelte-package`-built library; CI workflow list (`melt-ui/next-gen@main:.github/workflows/`) includes `ci.yml`, `pkg-vc.yml` (likely `pkg.pr.new`-style preview publishing), and `release.yml`.

### Svelte 5 idioms
- The whole point of `next-gen` is a runes-first rewrite ("Built for Svelte 5" per its own `package.json` description), but no bespoke lint rule enforces runes usage beyond the standard `eslint-plugin-svelte` recommended set.

### Beyond the linter
- The "Heuristics" section functions as this project's de facto design/code-review philosophy; no separate ADR folder found.

---

## 4. svecosystem/runed

Repo: `svecosystem/runed`, default branch `main`.

### ESLint
`runed@main:eslint.config.js` — same huntabyte-authored dual-linter pattern as bits-ui (oxlint + eslint), using `includeIgnoreFile` to reuse `.gitignore` as ESLint's ignore list:
```js
import { includeIgnoreFile } from "@eslint/compat";
import oxlint from "eslint-plugin-oxlint";
export default ts.config(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } }, rules: { "no-undef": "off" } },
  { files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"], ignores: ["eslint.config.js", "svelte.config.js"],
    languageOptions: { parserOptions: { projectService: true, extraFileExtensions: [".svelte"], parser: ts.parser } },
    rules: { "prefer-const": "off", "svelte/no-navigation-without-resolve": "off", "svelte/prefer-svelte-reactivity": "off", "no-unused-private-class-members": "off" } },
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }], "@typescript-eslint/no-unused-expressions": "off", "@typescript-eslint/no-empty-object-type": "off" } },
  { ignores: [ /* build/dist/.svelte-kit paths */ ] },
  ...oxlint.configs["flat/recommended"]
);
```
(Note: unlike bits-ui, runed does **not** load a project-specific `.oxlintrc.json` file into the chain, even though `.oxlintrc.json` exists at repo root — it only spreads `oxlint.configs["flat/recommended"]`.)

### Prettier
`runed@main:.prettierrc`:
```json
{
  "useTabs": true, "singleQuote": false, "trailingComma": "es5", "semi": true, "printWidth": 100,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [
    { "files": "*.svelte", "options": { "parser": "svelte" } },
    { "files": "*.md", "options": { "parser": "markdown", "printWidth": 100, "proseWrap": "always", "useTabs": true, "trailingComma": "none", "bracketSameLine": true } }
  ],
  "tailwindFunctions": ["clsx", "cn", "tv"]
}
```
- Identical profile to bits-ui and shadcn-svelte (double quotes, `es5` commas, tailwind plugin last, same `tailwindFunctions` list) — strong evidence this is a shared huntabyte-ecosystem house style rather than three independent choices.

### TypeScript strictness
`runed@main:packages/runed/tsconfig.json`:
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true, "checkJs": true, "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true, "resolveJsonModule": true,
    "skipLibCheck": true, "sourceMap": true, "strict": true,
    "module": "NodeNext", "moduleResolution": "NodeNext",
    "noUncheckedIndexedAccess": true,
    "types": ["vitest/globals"],
    "experimentalDecorators": true
  }
}
```
- `strict` + `noUncheckedIndexedAccess`, no `verbatimModuleSyntax` here (unlike bits-ui). `types: ["vitest/globals"]` is a config detail worth copying if this repo ever wants global `describe`/`it` without imports.

### CONTRIBUTING / process
`runed@main:CONTRIBUTING.md` is the most structured, actionable CONTRIBUTING doc in this whole survey — worth close reading for this repo's own revision:
- States prerequisites precisely: "Node >= 20", "pnpm >= 10.12.1 (repo pins `pnpm@10.17.0`)".
- Documents a **generator command**, `pnpm new`, that scaffolds a new utility's library file, docs page, and demo stub in one step — a "golden path" tool rather than a written checklist for a repeated task shape.
- Explicit testing guidance: "Prefer unit tests with Vitest; add component tests where UI behaviors matter... Integration tests use Playwright; keep them minimal and fast."
- Explicit tooling-responsibility split: "**Prettier is the source of truth for formatting. ESLint and oxlint enforce code quality.**" — a clean one-line division of labor this repo could adopt verbatim as a principle.
- Changesets: "Every user-visible change to the published package should include a changeset. Changesets will be added by maintainers during the PR process" — i.e. contributors are not required to run `pnpm changeset` themselves; maintainers add it. Differs from kit/bits-ui, which ask contributors to generate the changeset.
- Ends with an explicit **PR checklist** (markdown task list): formatted+linted, types pass, tests pass locally, docs updated if applicable.

### Testing
`runed@main:packages/runed/vite.config.ts` is a genuinely novel pattern — a single Vitest config with a `test.workspace` array splitting **jsdom unit tests** from **real-browser Playwright-provider tests**, both under one `vitest` invocation:
```ts
import { svelteTesting } from "@testing-library/svelte/vite";
export default defineConfig({
  plugins: [vitestBrowserConditionPlugin, sveltekit(), svelteTesting()],
  test: {
    includeSource: ["src/**/*.{js,ts,svelte}"],
    globals: true,
    coverage: { exclude: ["./setupTest.ts"] },
    workspace: [
      { extends: true, test: { setupFiles: ["./setupTest.ts"], include: ["src/**/*.{test,test.svelte}.{js,ts}"], exclude: ["src/**/*.browser.{test,test.svelte}.{js,ts}"], name: "unit", environment: "jsdom" } },
      { extends: true, test: { include: ["src/**/*.browser.{test,test.svelte,spec}.{js,ts}"], name: "browser", browser: { instances: [{ browser: "chromium" }], enabled: true, provider: "playwright", headless: true } } },
    ],
  },
});
```
- `coverage.exclude` is configured but **there is no coverage threshold** (`coverage.thresholds` / `--coverage` gate) anywhere in this file or in `ci.yml` — confirms "not found" for enforced coverage gates in this repo too.
- A real test file, `runed@main:packages/runed/src/lib/utilities/debounced/debounced.test.svelte.ts`, shows the runes-in-tests idiom directly:
  ```ts
  import { Debounced } from "./index.js";
  import { testWithEffect } from "$lib/test/util.svelte.js";
  describe("Debounced", () => {
    testWithEffect("Value does not get updated immediately", async () => {
      let value = $state(0);
      const debounced = new Debounced(() => value, 100);
      expect(debounced.current).toBe(0);
      value = 1;
      // ...
    });
  });
  ```
  Note the file extension `.test.svelte.ts` (not plain `.test.ts`) — required so the Svelte/Vite preprocessor compiles the `$state` rune inside a non-`.svelte` test file, and a custom `testWithEffect` wrapper (not vanilla Vitest `test`) supplies the reactive/effect root the runes need outside a component. `@testing-library/svelte@^5.2.0` plus `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event` are all present as devDependencies for the component-level tests that do render markup.

### Svelte 5 idioms
- The `testWithEffect` pattern above is the clearest documented (via source, not prose) convention for testing runes-based reactive primitives outside components — directly relevant to any `$lib/domain` or `$lib/stores` code in this repo that uses runes/`$state` outside `.svelte` files.

### Beyond the linter
- No ADR folder; the `pnpm new` generator functions as an enforced structural convention (every utility gets the same file layout) without needing a prose rule.

---

## 5. skeletonlabs/skeleton

Repo: `skeletonlabs/skeleton`, default branch `main`.

### ESLint
**Not found** — skeleton has **dropped ESLint entirely**. Root `skeletonlabs/skeleton@main:package.json` devDependencies list `oxlint` and `oxlint-tsgolint` but no `eslint` package at all, and the lint script is oxlint-only:
```json
"lint": "oxlint --type-aware --fix",
"lint:check": "oxlint --type-aware",
```
`skeletonlabs/skeleton@main:.oxlintrc.json`:
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "react", "react-perf", "oxc", "import"],
  "categories": { "correctness": "error" },
  "ignorePatterns": ["**/database.types.ts"],
  "overrides": [ { "files": ["*.svelte"], "rules": { "no-unassigned-vars": "off" } } ]
}
```
- `--type-aware` flag (oxlint's newer type-checked mode, akin to typescript-eslint's `recommended-type-checked`) plus the `oxlint-tsgolint` companion package (oxlint's Go-based type-checking backend) — this is the most "post-ESLint" setup in the survey. The `react`/`react-perf` plugins are enabled because skeleton ships a parallel React package (`@skeletonlabs/skeleton-react`) in the same monorepo, not because the Svelte package needs them.

### Prettier
`skeletonlabs/skeleton@main:.prettierrc.json`:
```json
{
  "$schema": "https://www.schemastore.org/prettierrc.json",
  "plugins": ["prettier-plugin-astro", "prettier-plugin-svelte", "@trivago/prettier-plugin-sort-imports", "@prettier/plugin-oxc"],
  "overrides": [
    { "files": "*.astro", "options": { "parser": "astro" } },
    { "files": "*.svelte", "options": { "parser": "svelte" } }
  ],
  "printWidth": 140,
  "singleQuote": true,
  "useTabs": true
}
```
- Two plugins not seen elsewhere in this survey: **`@trivago/prettier-plugin-sort-imports`** (enforces/auto-fixes import statement ordering — directly relevant to this repo's manual "Imports: order svelte → third-party → $lib → relative" rule, which currently has no automated enforcement) and **`@prettier/plugin-oxc`** (an oxc/Rust-based Prettier plugin, part of the same "post-JS-tooling" move as oxlint). `printWidth: 140` is unusually wide compared to the 100 used everywhere else in this survey. No Tailwind plugin despite skeleton being a Tailwind-based UI kit — Tailwind class sorting is apparently not enforced here.

### TypeScript strictness
`skeletonlabs/skeleton@main:packages/skeleton-svelte/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "nodenext", "moduleResolution": "nodenext",
    "esModuleInterop": true, "skipLibCheck": true, "target": "es2022",
    "allowJs": true, "resolveJsonModule": true,
    "moduleDetection": "force", "isolatedModules": true,
    "verbatimModuleSyntax": true, "strict": true,
    "noUncheckedIndexedAccess": true, "noImplicitOverride": true,
    "declaration": true, "noEmit": true,
    "lib": ["es2022", "dom", "dom.iterable"]
  }
}
```
- Tied with bits-ui/shadcn-svelte for strictest in survey: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, plus `isolatedModules` and `moduleDetection: "force"` (both relevant for esbuild/swc-based toolchains) and `noImplicitOverride` (not seen in any other repo here).

### CONTRIBUTING / process
- **No `CONTRIBUTING.md` found** at repo root (confirmed 404 for both `CONTRIBUTING.md` and `.github/CONTRIBUTING.md`; root directory listing has no such file). No PR template found either (root `.github` listing returned only `FUNDING.yml`/`ISSUE_TEMPLATE`-equivalent files, no template confirmed).
- CI is split across two workflow files: `build-publish.yml` and **`code-quality.yml`** (`skeletonlabs/skeleton@main:.github/workflows/code-quality.yml`), the latter running four **separate parallel jobs** — `format` (`pnpm format:check`), `lint` (`pnpm lint:check`), `check` (`pnpm check`, i.e. type-check), `test` (`pnpm test`, with `playwright install chromium` as a prerequisite step) — rather than one combined "lint-all" job like kit's. This is the most CI-job-granular setup in the survey (one job per concern = one red X per concern, easier to see at a glance what broke).
- Uses changesets (`.changeset/` dir present, `@changesets/cli` in devDependencies, `changeset:publish`/`changeset:version` scripts).
- Has a `renovate.json` for automated dependency updates: `"extends": ["config:recommended", "schedule:earlyMondays", ":semanticCommitTypeAll(task)"]`, `"minimumReleaseAge": "3 days"` (waits 3 days after a dependency's release before opening a PR for it — a supply-chain-safety delay).

### Testing
- `"test": "vitest run"` at the root; per-package `"check": "svelte-check --tsconfig ./tsconfig.json"`. No coverage threshold found in any config fetched.

### Svelte 5 idioms
- The `.oxlintrc.json` Svelte-file override turning off `"no-unassigned-vars"` for `*.svelte` files is the only Svelte-specific carve-out found — implies skeleton relies on Svelte's own compiler diagnostics plus TypeScript rather than a Svelte-aware ESLint plugin (since there is no ESLint at all) for anything runes-specific.

### Beyond the linter
- No ADR-equivalent or written review checklist found in the fetched files. A `.claude/` directory exists at repo root (visible in the root listing) suggesting Claude-Code-specific tooling/instructions, but auditing its contents was out of scope for this coding-standards research task.

---

## 6. huntabyte/shadcn-svelte

Repo: `huntabyte/shadcn-svelte`, default branch `main`.

### ESLint
`shadcn-svelte@main:eslint.config.js` — flat config using the newer `defineConfig` helper from `eslint/config` (rather than the bare array export used by kit/bits-ui/runed):
```js
import { defineConfig } from "eslint/config";
import { includeIgnoreFile } from "@eslint/compat";
export default defineConfig(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["flat/recommended"],
  prettier,
  ...svelte.configs["flat/prettier"],
  { languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "no-undef": "off", "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }], "@typescript-eslint/no-unused-expressions": "off" } },
  { files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: { parserOptions: {
        // Only uncomment this if you want it to take 3 minutes https://github.com/sveltejs/eslint-plugin-svelte/issues/1084
        // projectService: true,
        extraFileExtensions: [".svelte"], parser: ts.parser } },
    rules: { "svelte/no-useless-mustaches": "warn", "svelte/no-navigation-without-resolve": "off" } },
  { ignores: ["build/", ".svelte-kit/", "dist/", "playgrounds/**/*", "packages/cli/dist/**/*", "registry-template/**/*"] }
);
```
- The commented-out `projectService: true` with a linked upstream issue (`sveltejs/eslint-plugin-svelte#1084`) is a directly citable, practical performance caveat: type-aware linting via `eslint-plugin-svelte`'s `projectService` can be extremely slow ("3 minutes") on this codebase, so shadcn-svelte deliberately opts out of type-aware Svelte-file linting.

### Prettier
`shadcn-svelte@main:.prettierrc`:
```json
{
  "useTabs": true, "tabWidth": 4, "singleQuote": false, "trailingComma": "es5", "printWidth": 100,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [
    { "files": "*.svelte", "options": { "parser": "svelte" } },
    { "files": "*.md", "options": { "tabWidth": 2, "useTabs": false, "printWidth": 79 } },
    { "files": ".github/**/*", "options": { "tabWidth": 2, "useTabs": false } }
  ],
  "tailwindFunctions": ["clsx", "cn", "tv"]
}
```
- Byte-for-byte the same profile as bits-ui and runed (double quotes, 4-space tabs, `es5` commas, Tailwind plugin last, same `tailwindFunctions` list) — again evidence of a shared huntabyte-authored house style propagated across his repos, not independently arrived at.

### TypeScript strictness
Both `shadcn-svelte@main:packages/registry/tsconfig.json` and `packages/cli/tsconfig.json` are identical and maximally strict:
```json
{
  "compilerOptions": {
    "strict": true, "module": "Node18", "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true, "isolatedModules": true,
    "skipLibCheck": true, "noEmit": true,
    "verbatimModuleSyntax": true, "erasableSyntaxOnly": true,
    "noUncheckedIndexedAccess": true
  }
}
```
- Same tier as bits-ui: `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax` + `erasableSyntaxOnly`.

### CONTRIBUTING / process
`shadcn-svelte@main:CONTRIBUTING.md` — shortest, most process-light CONTRIBUTING doc in the survey, but contains a notable, currently-topical section not found in any other repo audited:
- **"Responsible use of AI"** (verbatim): "We take no issue with you using AI to help you contribute to `shadcn-svelte`. However we ask that when creating an issue, and writing PR descriptions you refrain from using AI to generate the content. AI is very good at writing code but often far too verbose when writing documentation, writing your own description will help us parse your contributions more easily." Plus: "If you are using AI to help you contribute from another language than English we ask that you translate your own description of the issue or PR."
- PR rule: "Your PR should fix a *single issue* linked in the PR description (e.g. `Fixes #123`)"; "Your PR should pass all CI checks and show a checkmark (Maintainers won't review PRs on red, or in draft)."
- Root listing also shows a `skills/` directory at repo root (sibling to `docs/`, `packages/`) — an unaudited detail (out of scope for this task) but worth flagging as a modern-repo pattern (agent-skill files checked into the repo itself, similar to this repo's own `docs/agents/`).
- Uses changesets; workflow list includes `autoformat.yml` (likely a bot that auto-formats PRs on push) alongside `ci.yml`, `pr-guard.yml`, and separate deploy workflows for `deploy-svelte-4.yml` / `deploy-tailwind-3.yml` (parallel legacy-version doc sites).

### Testing
- No dedicated test workflow name found in the `.github/workflows` listing beyond `ci.yml` itself (not independently fetched in this pass; testing specifics for shadcn-svelte are the weakest-verified section of this survey and should be treated as **not fully confirmed** rather than "not found").

### Svelte 5 idioms
- `"svelte/no-useless-mustaches": "warn"` is the one Svelte-specific stylistic rule beyond the recommended preset — a lint nudge against redundant `{expr}` mustache wrapping.

### Beyond the linter
- No ADR-equivalent found. The "Responsible use of AI" policy is the standout process artifact — worth considering for this repo's own CONTRIBUTING.md given how much of this repo's own workflow already involves AI agents (per its `docs/agents/` directory and AGENTS.md).

---

## 7. ciscoheat/sveltekit-superforms

Repo: `ciscoheat/sveltekit-superforms`, default branch `main`.

### ESLint
`sveltekit-superforms@main:eslint.config.js` — flat config, notable for pulling in a niche plugin, **`eslint-plugin-dci-lint`** (Data-Context-Interaction linting, reflecting the maintainer's own DCI-influenced coding style), and for explicitly importing `svelte.config.js` into `parserOptions` (same care taken by melt-ui/next-gen):
```js
import dciLint from 'eslint-plugin-dci-lint';
import svelteConfig from './svelte.config.js';
export default ts.config(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  dciLint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-undef': 'off', 'svelte/require-each-key': 'off', 'svelte/no-navigation-without-resolve': 'off', 'dci-lint/literal-role-contracts': 'off' } },
  { files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: { parserOptions: { projectService: true, extraFileExtensions: ['.svelte'], parser: ts.parser, svelteConfig } } },
  { files: ['src/lib/**'], rules: { 'no-console': ['error', { allow: ['warn'] }] } }
);
```
- `{ files: ['src/lib/**'], rules: { 'no-console': ['error', { allow: ['warn'] }] } }` — same "shipped library source held to a stricter console-usage bar than the rest of the repo" pattern seen in bits-ui, but here it explicitly still permits `console.warn` (not a blanket ban).

### Prettier
`sveltekit-superforms@main:.prettierrc`:
```json
{
  "useTabs": true, "singleQuote": true, "trailingComma": "none", "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```
- Matches kit's profile almost exactly (tabs, single quotes, no trailing comma, 100 width, only the Svelte plugin — no Tailwind, since superforms itself ships no styling).

### TypeScript strictness
`sveltekit-superforms@main:tsconfig.json`:
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true, "checkJs": true, "esModuleInterop": true,
    "emitDecoratorMetadata": true, "experimentalDecorators": true,
    "forceConsistentCasingInFileNames": true, "resolveJsonModule": true,
    "skipLibCheck": true, "sourceMap": true, "strict": true,
    "module": "NodeNext", "moduleResolution": "NodeNext"
  }
}
```
Plus a second, narrower `tsconfig.check.json` used specifically for the `check` script:
```json
{ "extends": "./tsconfig.json", "exclude": ["src/routes/(v2)/v2/components/**"] }
```
- `strict: true` only — **no** `noUncheckedIndexedAccess`, **no** `verbatimModuleSyntax`, **no** `exactOptionalPropertyTypes`. The lightest TS config among the component/utility libraries surveyed (heavier on decorator metadata support instead, presumably for compatibility with some class-validator-style validation adapters it supports). The separate `tsconfig.check.json` pattern — a type-check-only variant that excludes a known-broken/WIP directory — is a reusable idea: lets `pnpm check` stay green while a documented subtree is excluded, rather than suppressing errors inline.

### CONTRIBUTING / process
- **No `CONTRIBUTING.md` found** (repo root listing confirmed no such file). Instead, the repo root has an **`AGENTS.md`** file (`sveltekit-superforms@main:AGENTS.md`), explicitly targeted at AI coding agents rather than human contributors — the closest primary-source parallel to this repo's own `AGENTS.md`/`CLAUDE.md` setup found anywhere in this survey. Key excerpts:
  - Explains the project's architecture (validation-adapter pattern, core API surface, data flow) so an agent doesn't need to rediscover it from scratch.
  - A **"Development Tips for AI Agents"** section with concrete file-pointer guidance, e.g. "When modifying adapters: Test with the corresponding test file..."; "For type issues: Look at `src/lib/adapters/typeSchema.ts`..."
  - Explicit process rule: "**When confirmed that the issue is fixed:** Run `pnpm test && pnpm check`, if ok update or add an `[Unreleased]` section in `CHANGELOG.md`, document the changes there" — i.e. this repo's AGENTS.md substitutes for both a CONTRIBUTING doc and a changeset tool: instead of running `changeset add`, the agent is told to hand-edit `CHANGELOG.md` directly.
  - No mention of ESLint/Prettier/lint commands as agent-facing instructions — formatting/linting is assumed tooling-enforced, not something the agent needs prose guidance on.
- `.github/` directory confirmed to contain only `FUNDING.yml` and `ISSUE_TEMPLATE/` — **no workflows directory, no CI pipeline files, no PR template** found in this repo at all. This is a strong "not found" data point: a widely-used, actively maintained library (12+ validation-library adapters) can and does ship without any GitHub Actions CI.
- `package.json` scripts show the pre-publish gate is manual/local rather than CI-enforced: `"prepublishOnly": "npm run test && npm run lint && npm run check && npm run prepack && npm run check:adapters"` — the maintainer runs this by hand before `npm publish`; there is no server-side enforcement.

### Testing
- Vitest (`src/tests/*.test.ts`). No coverage threshold found — none of the fetched files reference `coverage` at all — the strongest "not found" for coverage gating in this survey, since there isn't even a CI job to gate on.

### Svelte 5 idioms
- AGENTS.md notes the library "uses Svelte stores (v4 reactivity) but has Svelte 5 components (`SuperDebugRuned.svelte`)" — i.e. superforms itself is a Svelte-4-reactivity-model library retrofitted with a couple of Svelte-5-only components, not a runes-native codebase. Least relevant of the seven for "Svelte 5 idioms enforced," and it says so about itself.

### Beyond the linter
- The `AGENTS.md` file *is* the "beyond the linter" artifact here — architecture explanation + review-relevant file pointers + a documented CHANGELOG-update step, filling the role that a CONTRIBUTING.md + changeset tool would normally fill, but written for an AI audience.

---

## Where this repo already aligns

- **Runes-only, no legacy `$:`** — `docs/architecture/code-standards.md` lines 21-22 ("Runes only (`$props()`, `$state()`, `$derived()`) — no legacy `$:`") matches the de facto practice in every actively-runes-native repo surveyed (bits-ui, runed, melt-ui/next-gen); none of them document this as a *lint rule* either — it's enforced by not writing legacy syntax, same posture this repo currently takes.
- **Named exports; default exports only for Svelte page/layout components** — `code-standards.md` line 16 matches the universal pattern across all seven repos' library source (no default-export-heavy style found anywhere; SvelteKit itself requires default exports only for `+page.svelte`/`+layout.svelte`, exactly the carve-out this repo already documents).
- **PR-title scope prefixes (`ci`, `docs`, `fix`, `feat`, `refactor`, `chore`)** — `CONTRIBUTING.md` lines 5-16 matches bits-ui's PR-title-prefix rule (`feat:`/`fix:`/`docs:`/`chore:`, `bits-ui@main:CONTRIBUTING.md` §8) almost exactly, and is the same shape as kit's changeset-message prefix rule ("Please prefix changeset messages with `feat:`, `fix:`, or `chore:`," `sveltejs/kit@main:.github/PULL_REQUEST_TEMPLATE.md`). This repo's choice to enforce the prefix at PR-title level only (not commit-by-commit) matches bits-ui's explicit stance: "we don't strictly enforce Conventional Commits" for commits themselves.
- **No Co-Authored-By lines** — `CONTRIBUTING.md` line 43 has no direct upstream parallel found (none of the seven repos mention this in their CONTRIBUTING/AGENTS docs one way or the other), but it doesn't conflict with anything found either.
- **Two-tier testing (colocated `*.test.ts` vs `tests/e2e/`)** — `docs/architecture/code-standards.md` line 28 matches the unit/browser-integration split found in bits-ui (`"test"` vs `"test:browser"` scripts) and runed's CONTRIBUTING ("Prefer unit tests with Vitest... Integration tests use Playwright; keep them minimal and fast," `runed@main:CONTRIBUTING.md`).
- **`Result<T, E>` for expected failures, throw only for unexpected ones** — no repo in this survey documents an equivalent rule explicitly, but this is a stronger, more considered position than anything found upstream (most repos rely on ad hoc error objects/exceptions) — nothing to change here, just noting this repo is already ahead of the surveyed baseline on this point.
- **CI gates on Type Check + Build** — `CONTRIBUTING.md` lines 31-37 matches the universal pattern: every repo surveyed that has CI at all (kit, bits-ui, runed, skeleton) gates merges on lint + typecheck + build/test as separate or combined steps; skeleton's `code-quality.yml` (four separate jobs: format/lint/check/test) is the most granular version of the same idea this repo could grow into if it wants finer-grained CI status reporting.

---

## Concrete gaps worth closing

1. **No ESLint config file exists despite `eslint`, `eslint-config-prettier`, `eslint-plugin-svelte` being installed and an `"lint": "eslint ."` script defined (verified this session — no `eslint.config.js` anywhere in the repo).** Every one of the seven surveyed repos ships a real `eslint.config.js` (or has dropped ESLint deliberately for oxlint, see gap 6). Concrete adoption: mirror the smallest, most directly comparable flat config found — `svecosystem/runed@main:eslint.config.js` or `huntabyte/shadcn-svelte@main:eslint.config.js` — both are single-package (not monorepo-with-custom-rules like kit), e.g.:
   ```js
   import js from "@eslint/js";
   import ts from "typescript-eslint";
   import svelte from "eslint-plugin-svelte";
   import prettier from "eslint-config-prettier";
   import globals from "globals";
   export default ts.config(
     js.configs.recommended,
     ...ts.configs.recommended,
     ...svelte.configs.recommended,
     prettier,
     ...svelte.configs.prettier,
     { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
     { files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
       languageOptions: { parserOptions: { extraFileExtensions: [".svelte"], parser: ts.parser } } }
   );
   ```
   This alone would make `code-standards.md`'s existing prose rules ("Strict mode, no `any`", "type over interface", exhaustive-switch, no-enums) at least partially machine-checkable instead of purely aspirational — e.g. adding `"@typescript-eslint/no-explicit-any": "error"` (bits-ui's `.oxlintrc.json` stance, not kit's) directly encodes `code-standards.md` line 4 ("no `any`") as a CI-enforced rule rather than a convention nobody's lint-checking.

2. **No Prettier config file exists despite `prettier`, `prettier-plugin-svelte` being installed and a `"format": "prettier --write ."` script defined (verified this session).** Without a `.prettierrc`, the installed `prettier-plugin-svelte` is never loaded (Prettier only activates plugins listed in a config file's `"plugins"` array), so `.svelte` files are currently formatted with Prettier's generic (non-Svelte-aware) fallback, or not reliably at all. Concrete adoption — closest match to this repo's existing tab/space and quote conventions should be decided by whoever revises this, but as a citable baseline, `sveltejs/kit@main:.prettierrc` is the minimal viable version (single plugin, no Tailwind). However, unlike kit, this repo *does* use Tailwind 4 per its own tech stack, so it should also add `prettier-plugin-tailwindcss` and, per the confirmed load-bearing ordering found in bits-ui/runed/shadcn-svelte, list it **last**:
   ```json
   {
     "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
     "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
   }
   ```
   (this repo would need to add `prettier-plugin-tailwindcss` to `devDependencies`, since it is not currently listed alongside `prettier-plugin-svelte`).

3. **`docs/architecture/code-standards.md` lines 3-7 (TypeScript strictness bullets) name `strict` mode informally but this repo's `tsconfig.json` strictness flags were not part of this audit's scope to re-verify — the standards doc does not currently mention `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, or `exactOptionalPropertyTypes` at all.** Three of seven surveyed repos (`huntabyte/bits-ui@main:packages/bits-ui/tsconfig.json`, `huntabyte/shadcn-svelte@main:packages/registry/tsconfig.json`, `skeletonlabs/skeleton@main:packages/skeleton-svelte/tsconfig.json`) enable both `noUncheckedIndexedAccess` and `verbatimModuleSyntax` together; two more (`svecosystem/runed`, `melt-ui/next-gen`) enable `noUncheckedIndexedAccess` alone. None of the seven enable `exactOptionalPropertyTypes` — this flag can be dropped from consideration as an industry-standard expectation; it is not one. Concrete adoption: add a line to `code-standards.md`'s TypeScript section — "`noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true` in `tsconfig.json`" — and verify/add those two flags in this repo's actual `tsconfig.json` (not audited in this pass; a follow-up should confirm current state before editing the prose).

4. **`code-standards.md` line 13-14 (import order: svelte/sveltekit → third-party → `$lib/*` → relative) is currently a prose rule with no automated enforcement mentioned.** `skeletonlabs/skeleton@main:.prettierrc.json` shows a drop-in fix: the `@trivago/prettier-plugin-sort-imports` Prettier plugin auto-sorts/auto-fixes import order to a configured pattern, removing the need to catch import-order violations in review. Concrete adoption: add `"@trivago/prettier-plugin-sort-imports"` to the `.prettierrc` plugin list (once one exists, per gap 2) with an `importOrder` array matching this repo's documented groups, e.g. `["^svelte", "^@sveltejs", "<THIRD_PARTY_MODULES>", "^\\$lib/", "^\\.\\.?/"]`.

5. **`CONTRIBUTING.md` has no equivalent of `bits-ui`'s and `shadcn-svelte`'s explicit "don't PR from `main`" / branch-naming rule, and no equivalent of shadcn-svelte's "Responsible use of AI" section — the latter is directly relevant given this repo already has an `AGENTS.md`, a `docs/agents/` directory, and heavy agent-driven contribution (RALPH-authored commits visible in this repo's own git log).** `huntabyte/shadcn-svelte@main:CONTRIBUTING.md` gives a citable template: "We ask that when creating an issue, and writing PR descriptions you refrain from using AI to generate the content... writing your own description will help us parse your contributions more easily." Concrete adoption: add a short "AI-assisted contributions" subsection to `CONTRIBUTING.md` (after the existing "PR Description" section, before "CI") stating whether/how AI-authored PR descriptions should be flagged or written in the contributor's own words, given this repo's actual practice already includes agent-authored PRs (distinct from asking humans not to use AI — this repo's policy needs to be about how agent-authored PRs self-identify, which none of the seven surveyed repos needed to address the same way).

6. **This repo's `code-standards.md` does not mention oxlint at all, and five of the seven actively-maintained Svelte-5 projects surveyed (bits-ui, runed, skeleton, and implicitly melt-ui/next-gen's ecosystem peers) have adopted oxlint either alongside ESLint (bits-ui: `"lint": "oxlint . && eslint ."`) or as a full ESLint replacement (skeleton: `"lint": "oxlint --type-aware --fix"`, no `eslint` dependency at all).** This is a directional trend worth flagging even though this repo's current gap (no ESLint config at all) needs fixing first before oxlint adoption would be a meaningful next step. Concrete adoption (later, not now): once gap 1 is closed, evaluate `oxlint` as a fast pre-commit/pre-push gate ahead of full ESLint, per `bits-ui@main:package.json` `"lint": "oxlint . && eslint ."` pattern — no code change needed yet, just a note that this is the direction the ecosystem is moving and worth a follow-up decision once the baseline ESLint config exists.

7. **`docs/architecture/testing-strategy.md`'s two-tier model (Vitest colocated vs. Playwright `tests/e2e/`) has no equivalent of runed's `testWithEffect` pattern for testing runes-based reactive logic (`$state`/`$derived`) that lives outside `.svelte` files (e.g. this repo's `$lib/stores/*.svelte.ts` files, which do exist per this repo's own file naming convention and current `git status`).** `svecosystem/runed@main:packages/runed/src/lib/utilities/debounced/debounced.test.svelte.ts` shows the concrete pattern: a `.test.svelte.ts`-named test file (not `.test.ts`) so the Svelte compiler processes the rune syntax, combined with a custom `testWithEffect` helper (not vanilla Vitest `test`) that supplies an effect root for `$state`/`$derived` to run correctly outside a mounted component. Concrete adoption: add a short note to `testing-strategy.md`'s Tier 1 section documenting that `.svelte.ts` files under test (e.g. `src/lib/stores/meal-editor.svelte.ts`, already present in this repo) should be tested via `*.test.svelte.ts` files if their tests need to exercise `$state`/`$derived`/`$effect` directly (not just call exported functions), and consider adding a `testWithEffect`-equivalent helper to a new `$lib/test/` directory, mirroring runed's `src/lib/test/util.svelte.ts`.

8. **No project in this survey enforces a Vitest coverage threshold in CI (confirmed "not found" across all seven: kit, bits-ui, melt-ui/next-gen, runed, skeleton, shadcn-svelte, superforms — no `coverage.thresholds`, no `--coverage` CI gate found in any fetched config).** This is not a gap for this repo to close — it's a confirmation that `testing-strategy.md`'s existing stance ("No CI coverage threshold currently enforced") matches unanimous industry practice among these seven repos, not an outlier choice. No action needed; documented here so a future reviewer doesn't reintroduce a coverage-threshold requirement based on an assumption that "everyone else has one."
