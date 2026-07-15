# 0025 — Event domain model (external confounders)

**Status:** Accepted — informs v1.1; no implementation yet.
**Date:** 2026-07-05
**Source:** [Program Engine Shape audit](../research/program-engine-shape.md) §3 Events, §6 #2, §5 sequence #3.
**Builds on:** the allergen catalog storage/harvest model (curated-kinds + `other:` pattern, now in CONTEXT.md), [ADR-0004](0004-causation-derived-not-recorded.md) (causation derived), [ADR-0016](0016-verdict-drives-schedule-not-status.md) (verdict parent-attributed), the Dexie-persistence model (new table, now in CONTEXT.md).

## Context

Feature direction F2 has the mother log external events — illness, teething,
vaccination, weather, pollen — that the engine must weigh. The audit surfaced that
these were under-modeled: only skin severity was named in the proposer payload. An
`Event` needs a first-class home, and its **role** in the domain must be pinned
before the proposer reasons over it.

## Decision

**`Event` is a first-class authoritative record. Its role is a *confounder in
reaction attribution*, not a schedule pause-trigger. "Event" names the user-logged
log only.**

### Role — confounder, not trigger

When a flare or reintroduction reaction is evaluated, nearby events are weighed as
*alternative causes* ("skin worse on egg day 3 — but there's a flu"), preventing
false allergen attribution. Events plug in **upstream of the verdict**:

```
Event → reaction attribution → verdict → schedule mutation
```

The schedule effect is mostly *indirect* — via the verdict the event shapes. This
sits squarely on the ADR-0004 causation-derived spine. Rejected: modeling Event as
a direct pause-trigger (a flu should inform attribution, not mechanically pause).

**Direct effect (ii), retained:** besides the confounder role, the engine **may
propose a proactive pause** — *don't start a new reintroduction while a confound is
active* ("can't read an egg test through a flu"). Forward-facing, same
signal-unreliable-in-window logic; the pause window is policy-derived, never a user
`endDate`. Rejected (i) pure-confounder (proactive pause is sound protocol
hygiene).

### Structure — curated kinds + `other:` escape + scoped detail

Verbatim reuse of the ADR-0017 pattern: `CanonicalAllergen`-style curated kinds +
`HarvestCandidate`-style `other:` escape.

- **Curated kinds** (`illness | teething | vaccination | weather | pollen`) carry
  structure **and** the ADR-0024 safety control — they channel input away from
  open-ended symptom prose.
- **`other:`** absorbs unknown-unknowns and can graduate like a harvested food.
- **Scoped free-text detail** gives the LLM confound-reasoning material inside a
  structured envelope.

Rejected (a) pure free text (maximum safety surface) and (b) closed enum (kills
the unknown-unknowns rationale that justified using an LLM at all).

### Temporal — `date` only, no `endDate`

`date` (onset, backdatable) only. Under the confounder framing, attribution needs
*proximity*, not a resolution date; `endDate` input is overkill. Duration nuance →
free-text detail; any proximity window → **derived typical-duration-per-kind**
(`policy.ts`), never user-entered. Dropping user-entered `endDate` removes a
staleness source and simplifies proposal-lifecycle handling (ADR-0026).

### Identity / mutability

Surrogate `id` (uuid) — **not** slot-keyed like `Meal` (multiple events per day,
no natural slot). Content editable, hard-deletable; `id` + `createdAt` immutable;
`date` (onset, user-set) ≠ `createdAt` (system). Mirrors `SkinObservation`, not
`Meal` upsert. Logged offline (Tier-0, immediate).

### Trigger kind — `event` FKs the Event row

A proposal's cause is a two-kind `trigger` (union defined in ADR-0026). The
`event` kind **carries the Event row id**; it is **not** a mandatory FK on every
proposal — cadence dose-nudges and flare-up detection are `derived-signal`
triggers with no Event row. An Event can exist with no proposal at all.

## Consequences

- New `events` Dexie table (ADR-0006), repository port, and export-snapshot entry
  (ADR-0002).
- `Event`, the `trigger` union, and `derived-signal` become
  `UBIQUITOUS_LANGUAGE.md` + `CONTEXT.md` terms.
- Typical-duration-per-kind constants join `policy.ts`.
- **Reaction is NOT an Event** — it is external context only. The acute-reaction
  datum from ADR-0024 needs a *positive home* on the reaction path; that
  reaction-model question is **open**, resolved with ADR-0024.
- The curated-kinds structure doubles as the ADR-0024 safety control.
