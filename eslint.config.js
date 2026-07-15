import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config (ESLint 9). Single-package shape mirrored from
// svecosystem/runed and huntabyte/shadcn-svelte. This file is what makes the
// prose rules in docs/architecture/code-standards.md machine-checkable rather
// than aspirational — see that doc's TypeScript section.
export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  ...svelte.configs['flat/prettier'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // TS parser must reach inside <script lang="ts"> blocks.
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
      },
    },
  },
  {
    rules: {
      // code-standards.md: "no `any` (use `unknown` + narrow)".
      '@typescript-eslint/no-explicit-any': 'error',
      // Allow intentionally-unused names when prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // A `let` read inside a closure before its later assignment (e.g. an
      // `unsub` referenced in a timeout that runs before `unsub = subscribe(...)`)
      // genuinely cannot be `const`; don't flag it.
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
    },
  },
  {
    // Runes make `let x = $state(...)` legitimate even when never reassigned,
    // so `prefer-const` fights Svelte 5 here — off for all Svelte-authored files.
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    rules: {
      'prefer-const': 'off',
    },
  },
  {
    // Build artifacts and generated PWA service-worker output.
    ignores: ['build/', 'dist/', '.svelte-kit/', 'dev-dist/'],
  },
);
