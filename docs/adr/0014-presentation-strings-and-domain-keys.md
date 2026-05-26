# 0014 — Presentation Strings and Domain Keys

**Status:** Accepted
**Date:** 2026-05-25

## Context

Czech display strings are baked into domain records emitted by
`schedule-builder.ts` and `schedule-queries.ts`. A `SchedulePhase` record
carries `label: 'Eliminační fáze'` and `description: '...'` — Czech text
frozen onto data that is otherwise locale-agnostic. `phase-display.ts` in
`src/lib/utils/` holds additional display text alongside icon and color
metadata. UI chrome (button labels, empty-state copy, headers) is inlined
in `.svelte` files with no consistent home.

This coupling has two costs:

1. **Domain logic contains UI noise.** A developer reading
   `schedule-builder.ts` must parse Czech prose to understand protocol
   rules.
2. **Locale extraction is non-mechanical.** Adding a second locale requires
   hunting strings in domain records, utility files, and component
   templates separately. There is no single place to audit for coverage.

ADR-0001 scopes v1 as single-device Czech, so a second locale is
speculative. The goal is to establish a pattern now — without adopting an
i18n library — so that domain logic stays clean and future extraction is
mechanical.

## Decision

**Domain records carry stable type identifiers. A dedicated display layer
owns all human-readable text and visual tokens.**

Domain-emitted records change from carrying `label`/`description` strings
to carrying `type` discriminators (e.g. `type: 'elimination'`). The display
layer resolves a type to a display entry at render time.

The display layer is split into two locations by concern:

- **`src/lib/strings/`** — pure Czech text, keyed by domain identifier or
  ergonomic name, enforced with `satisfies Record<DomainKind, ...>` where
  applicable so missing keys fail `tsc`:
  - `phases.ts` — keyed by `PhaseType`; fields: `label`, `badgeLabel`, `description`
  - `portions.ts` — keyed by `PortionKind`
  - `categories.ts` — keyed by `AllergenId`
  - `actions.ts` — common verbs (`save`, `edit`, `cancel`, `confirm`, …)
  - `common.ts` — toasts, empty states, form errors, headers, page titles
- **`src/lib/config/`** — config files that spread from `strings/` and add
  visual tokens (icon, Tailwind classes). Single lookup point for consumers;
  enforced with `satisfies Record<DomainKind, ...>`:
  - `phases.ts` — spreads `phaseStrings` + adds `icon`, `badge`, `iconBg`

All entries are `as const` for literal-type inference. No i18n library is
adopted. Pluralization and date formatting remain in `src/lib/utils/`.

### Domain-key shapes

Domain identifiers used as `Record<>` keys are string-literal unions defined
in `src/lib/domain/models.ts`. Where the identifier admits two tiers — a
fixed protocol-defined set plus a user-extensible set — the type is split:

- `ProtocolAllergenId` — the 13 fixed allergen slugs the reintroduction
  protocol covers (`'dairy' | 'eggs' | ...`).
- `CustomAllergenId = \`other:${string}\`` — slugs the mother defines herself
  (e.g. `'other:Paprika'`). They participate in elimination logs but can
  never enter a protocol phase.
- `AllergenId = ProtocolAllergenId | CustomAllergenId` — the union, used at
  fields whose value could legitimately come from either tier.

Field types are picked per their domain invariant, not uniformly:
`SchedulePhase.allergenIds: ProtocolAllergenId[]` (protocol-only by
construction); `MealItem.allergenId: AllergenId | null` (mother may log
custom items). Lookups crossing the boundary go through
`getProtocolForAllergen(id: AllergenId): AllergenProtocol | undefined` in
`src/lib/data/reintroduction-protocols.ts`, where the partial mapping is
honest.

The same shape applies to any future domain identifier with a fixed-plus-
extensible structure: define the narrow union, the extensible template
literal, and the unified type alongside in `models.ts`.

## Alternatives Considered

**Inline per-component** — status quo for UI chrome. Rejected: no central
audit point, same string drifts across components.

**Single flat strings file** — one `src/lib/strings.ts` for everything.
Rejected: grows unbounded, no structural enforcement that domain-keyed
strings cover every kind.

**Per-component string files** — a `strings.ts` next to each `.svelte`.
Rejected: domain-keyed strings would still be split across multiple files;
no compile-time exhaustiveness.

**i18n library (svelte-i18n, paraglide)** — adds runtime, message-key
indirection, and a build step. Rejected for v1: no committed second locale,
and the `satisfies Record<>` pattern gives compile-time coverage without
library overhead.

## Consequences

- **Positive:** Domain modules are free of Czech text. Adding a new kind
  (phase type, portion size) produces a compile error in the strings layer
  if its display entry is missing — coverage is enforced structurally, not
  by convention.
- **Positive:** A future second locale becomes one additional file per
  concern (`phases.en.ts` or a `{ cs, en }` export) — the domain layer
  is untouched.
- **Negative:** Domain records that previously carried `label` for
  convenience (e.g. rendering without an import) now require a strings
  import at render sites. Acceptable cost for a PWA with ~7 routes.
- **Negative:** The five-file namespace (`phases`, `portions`, `categories`,
  `actions`, `common`) must be respected. New concerns should not proliferate
  additional files without a deliberate decision.
