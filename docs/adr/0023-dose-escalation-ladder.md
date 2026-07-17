# 0023 — Dose-escalation ladder as first-class domain data

## Overview

Reintroducing a food isn't a yes/no switch — it's a climb. You give a pinch, then a teaspoon, then a spoon, then a normal portion, moving up only while the skin stays calm. This decision gives that climb a proper place in the app: each testable allergen carries a "ladder" of dose steps (rungs), tailored to the baby's feeding stage (exclusively breastfed, breastfed plus solids, or fully on solids), taken from the source protocol tables.

The app never stores "which rung are we on" as an editable number — it works that out from the history of what was actually eaten, so the record and the reality can't drift apart, and skipping a rung simply can't be expressed. A companion piece of logic reads the ladder together with the recent meals and skin and returns a single recommendation — advance, hold, rest, step back, and so on — but it only *recommends*; it never writes anything or moves the plan by itself.

A later clinical refinement of that recommendation logic (probe a small dose then confirm, step back down after a reaction, and react to which body regions flare) is designed but not yet built, and is tracked in its own plan.

---

**Status:** Accepted — types + curated data + derivation landed (PR #430, 2026-07-07). Consumer migration + legacy `AllergenProtocol`/`ProtocolDay` deletion landed (PRD #421 PR B / issue #429, 2026-07-08). Deterministic decision engine (`decideLadderMove`) landed (PRD #445 / issue #447, 2026-07-12); see [Decision engine](#5-decision-engine-decideladdermove-prd-445) below. Rung-scale open question resolved 2026-07-05 by PRD [#421](https://github.com/jirigrill/eczema-helper/issues/421); see [Rung-scale resolution](#rung-scale-resolution-2026-07-05) below. Per-rung Czech text location deviates from ADR-0014 — see the PR #430 amendment in that section. The **clinical reshape** (probe/confirm walk-down, skin-driven region-aware reactions) is accepted design but not yet implemented; it is scoped in [PRD #454](https://github.com/jirigrill/eczema-helper/issues/454) — see [§6](#6-decision-engine--clinical-reshape-amendment-2026-07-14-detection-layer-2026-07-16) below, which supersedes the reaction/cadence semantics in §5 where they conflict once built. Its **reaction-detection layer** was reshaped by wayfinder map [#491](https://github.com/jirigrill/eczema-helper/issues/491) (2026-07-16): the region detector is a tripwire raising a `suspected-reaction` hold, never an auto-ban — see §6.
**Date:** 2026-07-05
**Source:** [Program Engine Shape audit](../research/program-engine-shape.md) §2b Gap 1, §3 Ladder, §5 sequence #1.
**Extends:** the AllergenStatus lifecycle and Dexie-persistence invariants (now in CONTEXT.md).
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

**Feeding stage — breastfed-only.** Ladders are keyed by `FeedingStage`
(`breastfed | mixed | solids`), but the app tracks a breastfed newborn (ADR-0001), so
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

### 5. Decision engine (`decideLadderMove`) — PRD #445

Section 1 gives the menu, section 2 derives the current rung, and PRD #421
shipped the read-only gate *signals* (`cadenceGate`, `skinCalmGate`,
`checkpointVerdictGate`; joined later by `skinStabilityGate` — see below). PRD
#445 adds the deterministic **brain** that composes
them: a single pure function `decideLadderMove(input): LadderDecision` in
`ladder.ts`. It is the F3 ≡ F4 walker — it never branches on phase; the phase
difference reduces to one injected `cadenceDays` value. It **decides but never
writes** (no meal/evaluation/schedule mutation); the mother still logs every
dose herself. It is the single definition of a legal move that the PRD #423
proposer's deep validator reuses (section 3).

**Verdict union.** A closed discriminated union `LadderDecision`:

```
advance(from, to) | hold(rung, reason, daysRemaining?) | rest(rung, days, until)
| step-back(from, to) | passed(rung) | blocked | ceiling-reached(rung)
```

`advance` with `from: null` is the first move (no separate `start`). `rest`
carries `until` (a date) so "re-test becomes due" is computable without re-adding
`days`. `blocked` carries no rung — the ladder was inert from the start (permanent
elimination, or a stage with no rungs); `ceiling-reached` carries the rung it got
stuck at.

**Gate precedence — most-overriding first.** (1) permanent elimination →
`blocked`; (2) floor exhausted or per-rung cap hit → `ceiling-reached`; (3) a
reaction still in effect → `rest` (window open) then `step-back`; (4) checkpoint
awaiting a verdict → `hold('awaiting-verdict')`; (5) skin worsened across the
stability window → `hold('skin-worsening', baseline→current)`;
(6) cadence not elapsed → `hold('cadence', daysRemaining)`; (7) otherwise →
`advance`, or `passed` at the effective top. Safety/clinical gates dominate rhythm
gates: a recorded reaction outranks an awaiting-verdict hold, and skin state
outranks cadence (never advance while skin is trending worse, even when the clock
allows it). A **steady baseline is not a hold reason on its own** — a child with
mild eczema at severity 1 that stays at 1 through the window is escalation-eligible;
only an increase over the window's baseline blocks. `skinCalmGate` remains in the
codebase as a UI-facing "is there a flare right now?" signal but is no longer part
of `decideLadderMove`'s decision path — `skinStabilityGate(observations, today,
stabilityWindowDays)` replaced it (`stabilityWindowDays = max(cadenceDays, 3)` via
`stabilityWindowFor` in `policy.ts`; the 3-day floor keeps reintroduction's 1-day
cadence from shrinking the safety window below a readable trend).

**Reaction → rest → step-back → re-test.** A checkpoint reaction yields
`rest(days)` keyed to severity (ADR-0016 `REST_PHASE_DAYS_*`). When the rest
window elapses (`today` past `until`) the engine surfaces `step-back` to the
**last-passing rung** (the rung directly below the reacting one) and re-tests
there — auto-due, but the dose is still a mother-logged meal. A clean re-test
re-advances: a reaction is a *temporary* setback, not a cap.

**Per-rung cap + unified terminal.** A rung that reacts `MAX_RUNG_REACTIONS` times
(a `policy.ts` constant) becomes a confirmed ceiling → `ceiling-reached`. The
floor case (lowest rung reacts, nowhere lower to retreat) unifies into the *same*
terminal. Both defer to human care; the engine never converts a terminal into a
`permanent-*` status itself (ADR-0012 / ADR-0024).

**Reaction binding by date.** A `ReintroductionEvaluation` carries no rung id, so
a reaction dated D binds to the highest still-live rung whose anchor was logged in
a meal on or before D.

**One shared replay.** A single private helper (`deriveLadderState`) replays
meals + evaluations in date order **once** and produces
`{ liveRung, lastPassingRung, pendingReaction, ceilingRung, reactionCounts }`.
`currentRung` becomes reaction-aware by projecting `liveRung` from it — so the
delicate reaction-binding + step-back logic is written exactly once and the two
public functions cannot drift. The replay is never exported.

> PRD #445 sketched this struct's payload as a flat `restUntil` date. The
> implementation instead carries a `pendingReaction` object (the rung, outcome,
> `until` date, and `stepBackTo` target kept together) and adds `ceilingRung`
> for the terminal state; `lastPassingRung` is derived as
> `pendingReaction?.stepBackTo ?? liveRung`. The observable behaviour and the
> public contract are unchanged — this is an internal shape refinement of a
> never-exported helper.

**Phase → cadence injection.** The engine takes `cadenceDays` as an explicit
value; the caller sources it from `cadenceForPhase(phase)` in `policy.ts`
(F3 `ACCEPTED_ALLERGEN_CADENCE_DAYS` vs F4 `REINTRODUCTION_CADENCE_DAYS`). The
engine never derives F3-vs-F4 itself.

Applying a verdict, and any UI rendering of it, is out of scope (PRD #423 / a
follow-up UI pass). `scripts/simulate.ts` drives the engine and renders a
`verdict:` line per allergen above the raw signals that produced it.

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
Czech-only single-tenant app: single-file review of the catalog beats
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
  the default ladder; added to the export snapshot (the encrypted export, tracked in [#438](https://github.com/jirigrill/eczema-helper/issues/438)).
- Ladder versioning + migration on default-ladder improvement is not yet
  implemented.
- The rung scale is **resolved** — see [Rung-scale resolution](#rung-scale-resolution-2026-07-05).
- **`AllergenProtocol` / `ProtocolDay` retired on PRD #421 PR B merge.** The
  ladder is the sole per-allergen dose-progression shape; `getProtocolForAllergen`
  and inline `instructionCs` are deleted. Per-rung Czech text lives on
  `LadderStep.dose` (inlined on the catalog record — see amendment above), not
  in `lib/strings/`.

## 6. Decision-engine — clinical reshape (amendment 2026-07-14, detection layer 2026-07-16)

The clinical reshape (probe/confirm walk, walk-down on reaction, skin-driven region-aware reactions) is **not yet implemented**; it is scoped in [PRD #454](https://github.com/jirigrill/eczema-helper/issues/454). Once built it supersedes the reaction/cadence semantics in §5 where they conflict.

The reshape has two halves. The **escalation** half (probe/confirm, walk-down, `settled`, `cadence ≥ latency`) is a sound deterministic menu of legal moves — the vocabulary §3's LLM proposer picks among. The **reaction-detection/attribution** half — *is this flare a reaction, and to which rung?* — was reshaped separately by wayfinder map [#491](https://github.com/jirigrill/eczema-helper/issues/491) (2026-07-16). This section records the detection decisions; the escalation half stays as PRD #454 scopes it.

### The detection principle: the engine emits a hold, it never auto-bans

A skin flare during reintroduction has three possible causes — the food (a reaction), an external confounder (teething / illness / heat / a new irritant), or benign adaptation (transient worsening that settles under continued exposure). Skin data alone cannot separate them; only the trajectory over the following days can. So the deterministic engine **must not** collapse a threshold crossing into `reaction → walk-down → ban`. Instead:

- The region-aware detector (PRD #454's `stop = (maxRegionΔ ≥ 2) OR (regionsWithΔ≥1 > 0.5 × trackedRegions)`) is **demoted from an auto-verdict to a tripwire**. Crossing it raises a first-class **`suspected-reaction` hold** — no advance, no ban — carrying the payload a judge needs: **skin geometry + nearby `Event`s + the food's authored allergenicity**.
- The **mother is always the constitutional judge of record** (ADR-0016, unrevised). A reaction verdict re-enters only as an ordinary **`ReintroductionEvaluation`** row she confirms. `decideLadderMove` stays a pure replay that reads confirmed rows and never calls the network; a confirmed row resolves the hold to walk-down (or clears it) on the next replay.
- An **LLM (online) or deterministic heuristic (offline) drafts** the verdict the mother one-tap confirms. The draft lives only at the UI/proposal edge (ADR-0026); the engine never knows who drafted the row it reads. A reaction verdict can never block on the network (ADR-0024).

This closes the architectural gap the earlier design left: the judgment that most needs flexibility — *was that flare actually a reaction?* — now has a seam for both the LLM and the mother, instead of being hard-coded as a fixed skin threshold inside the engine.

### The adaptation window: a first-class derived state

Between "clean advance" and "reaction → walk-down" sits a **decelerated-continuation** state the earlier design lacked. `deriveLadderState` gains a replay state **`pendingAdaptation`** and a new `LadderDecision` variant **`adapting-decelerate`** (emitted *only* while the window is open):

- **Opens** on: first contact with the food **+** a sub-threshold flare **+** the food's authored **`allergenicity: 'low'`**. A high-allergen food goes straight to the reaction path; a threshold-crossing day-1 flare is a reaction regardless of class.
- **Response:** hold the dose flat, keep re-dosing, **never push through** — this is not OIT (which stays out of scope; supervised-care territory, ADR-0024).
- **Exits** (window = 2 days, tunable): crosses threshold → reaction (walk-down); trending down → `settled` (dose kept, resume in **confirm cadence, never fast probe**); the ambiguous middle raises the `suspected-reaction` hold and defers to the mother's judgment, drawn on the flare-vs-dose trajectory.

Adaptation stays **fully derived** (ADR-0012, no drift); the only authored addition is the `allergenicity` field. It is an **intrinsic property of the allergen, not the dose progression**, so it lives on the `CanonicalAllergen` record (optional `allergenicity`), *not* on `Ladder` — authored only where a `ladder` is present (the adaptation window it gates exists only during reintroduction) and paired with it by a catalog invariant test. Landed in [#499](https://github.com/jirigrill/eczema-helper/issues/499) (type + curated placeholder data, no engine consumer yet).

### What ships now vs later — the cut line

Map #491's reconciliation ([#495](https://github.com/jirigrill/eczema-helper/issues/495)) draws the ship-now cut line at the **`suspected-reaction` hold boundary**, *not* the escalation-vs-detection split — because a naive "escalation now, detection later" would ship an auto-banning walk-down that this section already rules illegal, only to tear it out.

- **Ships now** (re-scoped PRD #454 — the whole *derived, LLM-free* engine up to the hold): probe/confirm (both flip triggers, incl. the adaptation-window entry), `settled`, `cadence ≥ latency` **unchanged**, the walk-down **mechanic driven by a confirmed `ReintroductionEvaluation` row**, the detector **demoted to a tripwire**, `pendingAdaptation` + `adapting-decelerate`, and `suspected-reaction` as a first-class decision.
- **Waits** (execution/UI follow-up, ADR-0026): the draft path (LLM/heuristic pre-fill), draft caching, the confirm UI, and the BFF/prompt.

**`cadence ≥ latency` is untouched by the seam.** It is a dosing-safety rule (never dose up into a brewing delayed reaction), not an attribution convenience — a faster human/LLM judgment does not earn closer dosing. The seam decides *whether* a flare is a reaction, never *which rung* or *how fast to dose*.

### Severe reactions — resolved (2026-07-17)

A `severe-reaction` is a **real engine-visible verdict** (picked on the confirm screen alongside mild/clear), not merely a redirect-layer flag; `decideLadderMove` branches on it. Confirming it derives the terminal **`ceiling-reached { reason: 'severe' }`** — the *existing* defer-to-human terminal, carrying a discriminated `reason: 'floor-exhaustion' | 'severe'` so severity survives in the engine *output* (mirroring how `hold` already discriminates on `reason`) rather than being flattened and rehydrated from the row. It does **not** walk down + re-confirm: re-exposing the child after a dangerous reaction is exactly what must not happen at home.

- **Same path, no bypass.** Severe routes through the ordinary `suspected-reaction` hold → mother-confirmed `ReintroductionEvaluation` row, like every other reaction. The **call-155 redirect + urgent raw-log fire independently at log-time** via ADR-0024's offline stem floor — they never wait on the ladder verdict — so the ladder verdict stays parent-attributed and calm ("confirmed later, calmly", ADR-0024 §D).
- **Strictly absorbing.** The engine never schedules a re-challenge out of `ceiling-reached { reason: 'severe' }`; the only exit is a human changing the underlying facts (a doctor clears it → the mother edits/removes the verdict row or adds a `ladder_override`), after which replay re-derives. Identical absorbing behaviour to `floor-exhaustion`; the two differ only in Czech copy + the redirect that already fired.

This resolves the PRD #454 OPEN item and unblocks coding the reaction branch. The **regulatory** question (is generated rationale "medical advice" under EU MDR, ADR-0024 §B) is a separate legal determination, untouched here; the **Czech copy** for the severe terminal is a UI/strings task, not decided here.
