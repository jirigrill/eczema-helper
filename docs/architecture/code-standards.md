# Code Standards

## Overview

The house rules for writing code here — TypeScript style, naming, imports, error handling, Svelte 5 usage, testing, and security. When in doubt, match the surrounding code. The sections below are the specifics.

## TypeScript
- Strict mode, no `any` (use `unknown` + narrow)
- `type` over `interface`; discriminated unions over optional fields; exhaustive switch with `never`
- No enums — `as const` objects or string literal unions
- Explicit return types on exported functions

## Naming
- Files: `kebab-case.ts`/`.svelte` · Types: `PascalCase` · Functions/vars: `camelCase` · True constants: `UPPER_SNAKE_CASE`
- Tests: `*.test.ts` colocated

## Imports
- Order: svelte/sveltekit → third-party → `$lib/*` → relative, blank line between groups
- No `../../../` — use `$lib/`
- Named exports; default exports only for Svelte page/layout components

## Error Handling
- `Result<T, E>` (`$lib/types/result`) for expected failures; throw only for truly unexpected ones; never swallow silently

## Svelte 5
- Runes only (`$props()`, `$state()`, `$derived()`) — no legacy `$:`
- Callback props (`onclick`), not `createEventDispatcher`
- Tailwind utilities; scoped `<style>` only when Tailwind can't express it
- File-local `{#snippet}` for repeated blocks with no outside reuse; snippet props (`children`, `right`, ...) when callers inject markup into a fixed shell; full component when the pattern spans files or has its own logic

## Testing
Two tiers, colocated `*.test.ts` (Tier 1) vs `tests/e2e/` (Tier 2). Full rules: `testing-strategy.md`.

## Security
- Never log sensitive data (passwords, tokens, decrypted photos, API keys)
- Validate/sanitize external input at adapter boundaries
- Encryption keys/passphrases never leave the client except as derived key material

## Presentation strings (ADR-0014, now here)
- UI text is never inlined on domain records. Domain records carry stable type keys (e.g. `type: 'elimination'`); Czech display strings live in `src/lib/strings/` (pure text) and `src/lib/config/` (text + visual tokens), resolved at render time. The one documented exception is `LadderStep.dose`. Authoritative statement: the "Domain records carry types, not display strings" invariant in `CONTEXT.md`.

## Stores: functional core, imperative shell (ADR-0015, now here)
- A store is an imperative shell over a pure core. The pure core is a named function in `src/lib/domain/` (e.g. `buildScheduleContext`) taking clean domain types and returning a plain object — no `db`, no async, no side effects. The imperative shell is the Svelte store in `src/lib/stores/`: it owns the `liveQuery` subscription, lifecycle states (`loading | empty | error`), row adaptation (stripping DB fields like `SINGLETON_ID`), and the transient-empty guard, then calls the pure core. The split never changes the store's public interface.
