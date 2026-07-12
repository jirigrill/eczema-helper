# 0023 — Dose-escalation ladder as first-class domain data

**Status:** Accepted — types + curated data + derivation landed (PR #430, 2026-07-07). Consumer migration + legacy `AllergenProtocol`/`ProtocolDay` deletion landed (PRD #421 PR B / issue #429, 2026-07-08). Rung-scale open question resolved 2026-07-05 by PRD [#421](https://github.com/jirigrill/eczema-helper/issues/421); see [Rung-scale resolution](#rung-scale-resolution-2026-07-05) below. Per-rung Czech text location deviates from ADR-0014 — see the PR #430 amendment in that section.
**Date:** 2026-07-05
**Source:** [Program Engine Shape audit](../research/program-engine-shape.md) §2b Gap 1, §3 Ladder, §5 sequence #1.
**Extends:** [ADR-0012](0012-allergen-status-lifecycle.md) (rung is derived like status), [ADR-0006](0006-dexie-persistence.md) (new override table).
**Supersedes (on PRD #421 PR B merge):** the day-scripted `AllergenProtocol` / `ProtocolDay` shape on the ADR-0017 catalog record — the ladder is the sole per-allergen dose-progression data.

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

**Reaction-capping (PRD #421):** the rung tracks *safely-tolerated* reality, not
everything ingested. A recorded reaction (an `allergen-test` evaluation for the
allergen whose outcome is not `tolerated`) caps the rung — only doses logged
strictly before the earliest such reaction count. A dose that provoked a
reaction never advances the ladder. `currentRung` takes the evaluation history to
apply this; omitting it counts every logged anchor.

**Feeding stage — v1 is breastfed-only.** Ladders are keyed by `FeedingStage`
(`breastfed | mixed | solids`), but v1 tracks a breastfed newborn (ADR-0001), so
every read resolves through the single `V1_FEEDING_STAGE` constant
(`canonical-allergen.ts`). The `mixed`/`solids` ladders are authored ahead of a
later release that has a real feeding-stage source; consumers reference the
constant rather than the `'breastfed'` literal so the assumption is greppable and
the call sites cannot drift.

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

## Open question — the rung scale — RESOLVED 2026-07-05

`PortionKind` may **not** suffice as the rung scale. A "pinch" of egg is not a
"pinch" of celery as an escalation step — `PortionKind` is food-agnostic, and a
ladder step is allergen-specific. The ladder likely needs either an
allergen-specific dose scale or a per-allergen `PortionKind → rung` mapping. This
is a **PRD-level modeling question**, not an architectural fork; the ladder ADR
records that the scale is unresolved and must be sized in the domain-model PRD.

### Rung-scale resolution (2026-07-05)

Resolved by PRD [#421](https://github.com/jirigrill/eczema-helper/issues/421):
**each `LadderStep` is anchored to an existing `PortionKind` and carries an
`isEvaluationCheckpoint` flag.** No new allergen-specific dose scale is
introduced.

**Amendment (PR #430, 2026-07-07):** the per-rung Czech dose descriptor is
**not** in `lib/strings/ladder.ts`. It is inlined as `LadderStep.dose` on the
catalog record instead — a deliberate deviation from ADR-0014 for the
Czech-only single-tenant v1: single-file review of the catalog beats
cross-file lookup for the person auditing the schedule. `lib/strings/ladder.ts`
was deleted along with its test. See `src/lib/domain/canonical-allergen.ts`.

Indicative shape (as landed):

```ts
type LadderStep = {
  id: string;
  anchor: PortionKind;               // ordered within the ladder
  isEvaluationCheckpoint: boolean;   // prompt reaction capture at this rung
  dose: string;                      // Czech caption, inlined (see amendment above)
};
type Ladder = {
  allergenId: string;
  stages: Partial<Record<FeedingStage, readonly LadderStep[]>>;
};
```

Reasoning:

- **Order is per-allergen, unit vocabulary is shared.** The
  "pinch-of-egg ≠ pinch-of-celery" problem is solved by making *sequence* per-allergen
  while reusing `PortionKind` as the anchor. A pinch is the same unit; egg's ladder
  advances through pinches differently than celery's.
- **No allergen-specific numeric scale.** Curation surfaced no allergen where
  `PortionKind` is too coarse. If one appears, a step gains an allergen-specific
  dose descriptor without changing the derivation or the domain module's contract.
- **Evaluation checkpoint is authored, not derived (Option A).** Every existing
  `ProtocolDay.isEvaluationDay: true` maps 1:1 to `isEvaluationCheckpoint: true`
  on the corresponding rung. Option B (rule: "top rung is always evaluation") was
  rejected — user story #16 requires curators to mark mid-ladder evaluation
  checkpoints; a rule can't express that.

### Consequences of Option A

- `LadderStep` grows a boolean field. Every ladder record must set it explicitly
  (`satisfies` clause per ADR-0014 will catch omissions at compile time).
- Consumers derive `isEvaluationDay` from `LadderStep.isEvaluationCheckpoint` at
  the *current rung* — not from a day index. The concept "day N is evaluation
  day" is replaced by "rung R is evaluation checkpoint" system-wide.
- The legacy `ProtocolDay.isEvaluationDay` and its consumer sites
  (`schedule-queries.ts`, `program/+page.svelte`) are migrated in PRD #421 PR B
  and deleted on final merge. See PRD #421 for the exact migration and parity
  test.

## Consequences

- New authored ladder data per protocol allergen (curation units, like the
  reintroduction protocol).
- A new derivation `currentRung(allergenId, meals, ladder)` joins the pure
  domain layer alongside `getAllergenStatuses`.
- A **ladder-override** Dexie table (ADR-0006) holds per-allergen deviations from
  the default ladder; added to the export snapshot (ADR-0002).
- Ladder versioning + migration on default-ladder improvement is deferred to the
  PRD.
- The rung scale is **resolved** — see [Rung-scale resolution](#rung-scale-resolution-2026-07-05).
- **`AllergenProtocol` / `ProtocolDay` retired on PRD #421 PR B merge.** The
  ladder is the sole per-allergen dose-progression shape; `getProtocolForAllergen`
  and inline `instructionCs` are deleted. Per-rung Czech text lives on
  `LadderStep.dose` (inlined on the catalog record — see amendment above), not
  in `lib/strings/`.
