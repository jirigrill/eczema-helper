# 0010 — No visual snapshot tests in v1

**Status:** Accepted
**Date:** 2026-05-24

## Context

Vitest unit tests run in jsdom, which does not execute CSS. They can
assert that a component sets `data-state="success"` on the right
element, but they cannot assert that the resulting pixel is the right
shade of green. The only way to catch a CSS-level regression (typo in
`app.css`, wrong opacity, wrong colour token) automatically is to
render in a real browser and compare against a stored image.

Playwright's `toHaveScreenshot` supports this. The project briefly
adopted it for InfoBanner variants and PhaseBadge (5 tests, 10 baseline
PNGs covering darwin + linux). PR #81 surfaced the maintenance cost:

- Snapshots are platform-specific (macOS CoreText vs Linux FreeType
  + HarfBuzz; subpixel antialiasing differs; font fallback chains
  differ). The repo committed both `*-darwin.png` and `*-linux.png`
  baselines, doubling inventory.
- Local `just test-e2e-update` only regenerated the developer's
  platform; the CI platform required a `workflow_dispatch` round trip.
- A trivial CSS atom migration (`text-xs` → `body-muted`, 12px → 14px
  font) cascaded into a snapshot failure that took longer to rebaseline
  than the refactor itself took to write.

For a solo-developer single-user PWA, the false-positive cost during
refactors exceeded the regression-catch benefit.

## Decision

**No visual snapshot tests in v1.** CSS-level regressions are caught by
manual review, not automation. Component unit tests assert class names
and `data-state` attributes; pixel rendering is not tested.

The Playwright e2e suite remains, but only for interaction, navigation,
and DOM-class behaviour. No `toHaveScreenshot` assertions.

## Re-entry conditions

Revisit this decision if any of:

- A real `app.css` regression ships unnoticed and causes user-visible
  breakage
- The project adds a second contributor (visual review can no longer
  rely on a single pair of eyes)
- The CSS surface area grows substantially (e.g. dark mode, theming,
  multiple opacity tiers per semantic state)

When that happens, the preferred re-entry approach is **Pattern C from
issue #82** — generate snapshots locally in the official Playwright
Docker image (`mcr.microsoft.com/playwright`), not the workflow-trigger
approach that proved friction-heavy.

## Alternatives considered

Full options matrix with pros/cons captured in [issue #82][82]. The
short version:

- **Option B — Keep snapshots, drop darwin baselines, skip on Mac.**
  Eliminates the two-platform problem but keeps the CI round-trip
  rebaseline friction.
- **Option C — Docker locally.** Pixel-identical to CI by construction;
  ~1.5 GB image as one-time cost. Best re-entry path.
- **Option D — Visual testing SaaS (Chromatic, Argos, Percy).** Solves
  the problem at the cost of a third-party dependency, account
  management, and snapshots leaving git history. Overkill for v1.

[82]: https://github.com/jirigrill/eczema-helper/issues/82
