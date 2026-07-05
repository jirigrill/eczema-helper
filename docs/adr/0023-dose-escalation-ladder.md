# 0023 — Dose-escalation ladder as first-class domain data

**Status:** Accepted — informs v1.1; no implementation yet. Feeds the ladder domain-model PRD.
**Date:** 2026-07-05
**Source:** [Program Engine Shape audit](../research/program-engine-shape.md) §2b Gap 1, §3 Ladder, §5 sequence #1.
**Extends:** [ADR-0012](0012-allergen-status-lifecycle.md) (rung is derived like status), [ADR-0006](0006-dexie-persistence.md) (new override table).

## Context

Feature directions F3 (accepted-allergen dose escalation) and F4
(reintroduction-phase dose escalation) both walk a per-allergen dose *up* over
time — "give a pinch of egg, then a teaspoon, then a spoon, if skin stays calm."
The program-engine audit collapsed **F3 ≡ F4 mechanically**: same ladder-walker,
different phase. Both need a concept the codebase does not have.

Verified against code, **no ladder / rung / escalation concept exists today**:

- `PortionKind` (`models.ts:83`) is a **flat, food-agnostic** 5-value union
  (`pinch | teaspoon | spoon | portion | package`), used only as a per-`MealItem`
  amount label and a UI chip order (`FoodEditor.svelte`) — never ordered, ranked,
  indexed, or compared as a dose scale.
- `getToleranceBuildingRemindersForDate(schedule, date, meals, catalog)` computes
  `daysSince` from `meal.date` **only** — zero amount awareness.
- The `'ladder'` grep hits are UI-CTA copy metaphors; `'escalating'` appears once
  in a reintroduction-phase-duration comment.

So dose escalation is **net-new domain modeling**, not a refactor: a new concept
(the ladder), a new derivation (current rung), and possibly a new scale type.

## Decision

**A dose-escalation ladder is first-class, deterministic, per-allergen protocol
data. The current rung is derived, never persisted. The LLM proposes movement on
or adjustment of the ladder; it never authors doses.**

### 1. Ladder = authored protocol data (the "menu")

Each protocol allergen carries an ordered ladder of dose steps — the graded
oral-challenge sequence. This is **curated clinical content** in the same class as
the reintroduction `protocol` on the allergen record (ADR-0017), authored
data-first, not crowdsourced. The ladder is the closed set of legal doses for that
allergen; anything off it is not a legal move.

### 2. Current rung = derived, never stored (mirrors ADR-0012)

The allergen's **current rung** is derived, exactly as `AllergenStatus` is derived
from schedule topology (ADR-0012) — never a stored field that can drift:

```
rung = f(allergen's meal-history amounts × that allergen's ladder)
```

Nothing in the codebase derives dose-position today; this is a whole-new
derivation over the meal log. Keeping the rung derived preserves the ADR-0012 /
ADR-0016 property that the record set is self-describing and single-sourced.

### 3. LLM picks among legal moves; the engine refuses off-menu

Movement on the ladder (advance a rung, hold, step back) is a proposal in the
closed `ScheduleProposal` vocabulary (ADR-0026). The LLM's freedom is *which
protocol-legal move, when* — **never authoring a portion**. "Menu vs chef": the
LLM orders from the menu; the deterministic kitchen refuses off-menu orders. The
deep validator (ADR-0026) rejects an illegal move (e.g. skipping a rung) before it
can apply.

### 4. Ships first, independently, with no LLM

The ladder is pure/deterministic and LLM-independent, so it is sequenced **first**
in the §5 worklist — it de-risks everything above it and is testable on its own
(F3/F4 deterministic default with no proposer wired).

## Open question — the rung scale

`PortionKind` may **not** suffice as the rung scale. A "pinch" of egg is not a
"pinch" of celery as an escalation step — `PortionKind` is food-agnostic, and a
ladder step is allergen-specific. The ladder likely needs either an
allergen-specific dose scale or a per-allergen `PortionKind → rung` mapping. This
is a **PRD-level modeling question**, not an architectural fork; the ladder ADR
records that the scale is unresolved and must be sized in the domain-model PRD.

## Consequences

- New authored ladder data per protocol allergen (curation units, like the
  reintroduction protocol).
- A new derivation `currentRung(allergenId, meals, ladder)` joins the pure
  domain layer alongside `getAllergenStatuses`.
- A **ladder-override** Dexie table (ADR-0006) holds per-allergen deviations from
  the default ladder; added to the export snapshot (ADR-0002).
- Ladder versioning + migration on default-ladder improvement is deferred to the
  PRD.
- The rung scale is an open modeling question (above) — the PRD must resolve it
  before the ladder is authored.
