# Testing Strategy

## Two-tier model

This project uses two complementary test tiers. The boundary between them is determined by whether the assertion involves real SvelteKit routing or real Dexie `liveQuery` reactivity.

### Tier 1 — Vitest + @testing-library/svelte

**Scope:** anything that can be asserted without a real browser or real routing.

| Category | Tool | Location |
|---|---|---|
| Domain logic (`schedule.ts`, etc.) | Vitest | colocated `*.test.ts` |
| Adapter layer (Dexie, in-memory) | Vitest + fake-indexeddb | colocated `*.test.ts` |
| Svelte components | @testing-library/svelte | colocated `*.test.ts` |

**Component test patterns:**

```ts
import { render, screen } from '@testing-library/svelte';
import { vi } from 'vitest';

// Mock SvelteKit internals
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/stores', () => ({ page: readable({ url: new URL('http://localhost/today') }) }));

// Mount and assert
const { getByText } = render(MyComponent, { props: { schedule: null } });
expect(getByText('Program není nastaven')).toBeInTheDocument();
```

**What belongs here:**
- Component renders correctly for each meaningful prop/state variant
- User interactions (clicks, form input) trigger the right callbacks or state changes
- Edge cases: null data, empty lists, boundary values
- Components that call `goto` — verify `goto` was called with the right path (via mock)

**What does NOT belong here:**
- Asserting that the browser actually navigated somewhere
- Multi-step flows across routes
- Behaviors that depend on `liveQuery` firing after a real DB write

### Tier 2 — Playwright

**Scope:** anything that requires a real browser, real routing, or real Dexie reactivity.

| Category | Location |
|---|---|
| Full navigation flows | `tests/e2e/` |
| Reactive layout behaviors (e.g. redirect on DB clear) | `tests/e2e/` |
| Onboarding → today transition | `tests/e2e/` |
| PWA / offline scenarios | `tests/e2e/` |

**Why the reactive redirect belongs here:**
The layout guard (`if answers === null → goto('/')`) involves:
1. A `liveQuery` subscription on the real IndexedDB
2. SvelteKit's actual `goto` triggering a real route change
3. The browser URL updating

Mocking all three in jsdom would test the mocks, not the behavior. A Playwright test that opens `/today`, clears IndexedDB via `page.evaluate(...)`, and asserts `page.url()` is `'/'` tests the real thing with minimal setup.

## Visual regression testing — deliberately not used

This project does **not** use Playwright's `toHaveScreenshot` visual
snapshot tests. CSS-level regressions (wrong opacity, wrong colour
token, broken atom) are caught by manual review, not by automation.

Rationale and re-entry conditions in [ADR-0010](../adr/0010-no-visual-snapshot-tests.md).
Full options matrix (Docker locally, visual SaaS, keep with platform
skips, etc.) captured in [issue #82](https://github.com/jirigrill/eczema-helper/issues/82).

If you find yourself wanting visual coverage back, start there before
re-introducing baselines — the previous attempt's friction is well
documented and the preferred re-entry path is the Docker-local
approach, not the workflow-trigger approach that was tried first.

## Infrastructure state

| Piece | Status |
|---|---|
| `vitest` | installed, configured in `vite.config.ts` |
| `fake-indexeddb` | installed, auto-loaded in `src/test-setup.ts` |
| `@testing-library/svelte` | **not yet installed** — needed for component tests |
| `@playwright/test` | installed, **not yet configured** (`playwright.config.ts` missing) |
| CI `unit-tests` job | active |
| CI `integration-tests` job | stub — re-author when coverage exists |
| CI `e2e-tests` job | stub — re-author when Playwright config lands |

## Mocking SvelteKit internals in Vitest

SvelteKit's `$app/*` modules are virtual — Vitest resolves them differently than Vite. Add aliases in `vite.config.ts` test section or use module mocking:

```ts
// In your test file or a shared test helper
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock('$app/stores', () => ({
  page: readable({ url: new URL('http://localhost/'), params: {}, data: {} }),
  navigating: readable(null),
  updated: readable(false),
}));
```

## Coverage expectations (per component)

Each Svelte component test file should cover:

1. **Happy path** — expected rendering with normal data
2. **Empty / null state** — what renders when data is absent
3. **Loading state** — if the component has one
4. **User interactions** — clicks, input, form submit (verify callbacks called)
5. **Boundary values** — e.g. schedule that ended yesterday, 0-item lists
