# 0023 — Dose-escalation ladder as first-class domain data

## Overview

Reintroducing a food isn't a yes/no switch — it's a climb. You give a pinch, then a teaspoon, then a spoon, then a normal portion, moving up only while the skin stays calm. This decision gives that climb a proper place in the app: each testable allergen carries a "ladder" of dose steps (rungs), tailored to the baby's feeding stage (exclusively breastfed, breastfed plus solids, or fully on solids), taken from the source protocol tables.

The app never stores "which rung are we on" as an editable number — it works that out from the history of what was actually eaten, so the record and the reality can't drift apart, and skipping a rung simply can't be expressed. A companion piece of logic (`decideLadderMove`) reads the ladder together with the recent meals and skin and returns a single recommendation — advance, hold, rest, step back, and so on — but it only *recommends*; it never writes anything or moves the plan by itself.

A clinical refinement of that recommendation logic (probe a small dose then confirm, step back down after a reaction, react to which body regions flare, and never auto-ban a food) is accepted design, partly built. Where it is unbuilt it is tracked in [PRD #454](https://github.com/jirigrill/eczema-helper/issues/454); see §6.

---

**Status:** Accepted, implemented (v1). Types + curated data + rung derivation + the deterministic `decideLadderMove` engine are landed and green. The **clinical reshape** (§6) is accepted design, in progress: its **escalation half** — probe/confirm mode (derived, no persisted flag), `reactionLatencyDays` with `cadence ≥ latency` in confirm, the top-rung dwell → `settled` terminal, and the retired checkpoint hold — is **landed** ([#500](https://github.com/jirigrill/eczema-helper/issues/500)). The reaction-detection layer is a *tripwire that raises a hold, never an auto-ban*, and severe reactions derive a terminal `ceiling-reached { reason: 'severe' }` — both still unbuilt (walk-down + detection are later slices). The v2 type scaffolding landed in [#498](https://github.com/jirigrill/eczema-helper/issues/498).
**Date:** 2026-07-05 (last substantive amendment 2026-07-17)
**Source:** [Program Engine Shape audit](../research/program-engine-shape.md) §2b Gap 1, §3 Ladder, §5 sequence #1.
**Extends:** the `AllergenStatus` lifecycle and Dexie-persistence invariants (CONTEXT.md).
**Supersedes:** the day-scripted `AllergenProtocol` / `ProtocolDay` shape on the ADR-0017 catalog record — the ladder is now the sole per-allergen dose-progression data (`AllergenProtocol`, `ProtocolDay`, `getProtocolForAllergen`, inline `instructionCs` deleted).
**Related:** proposal vocabulary + deep validator (ADR-0026); offline safety floor + "confirmed later, calmly" (ADR-0024); `AllergenStatus` derivation (ADR-0012); mother as constitutional judge (ADR-0016).

## Decision

**A dose-escalation ladder is first-class, deterministic, per-allergen protocol data. The current rung is derived, never persisted. The LLM proposes movement on the ladder; it never authors doses.**

Feature directions F3 (accepted-allergen dose escalation) and F4 (reintroduction-phase dose escalation) both walk a per-allergen dose *up* over time. They collapse mechanically — **F3 ≡ F4**: same ladder-walker, different phase, and the phase difference reduces to one injected `cadenceDays` value.

### 1. Ladder = authored protocol data (the "menu")

Each protocol allergen carries an ordered ladder of dose steps — the graded oral-challenge sequence. This is **curated clinical content** in the same class as the reintroduction protocol on the allergen record (ADR-0017), authored data-first. The ladder is the closed set of legal doses for that allergen; anything off it is not a legal move.

```ts
type LadderStep = {
  id: string;
  anchor: PortionKind;               // ordered within the ladder
  isEvaluationCheckpoint: boolean;   // prompt reaction capture at this rung
  dose: string;                      // Czech caption, inlined on the catalog record
  allergenicity: 'low' | ...;        // authored; drives the adaptation window (§6)
};
type Ladder = {
  allergenId: string;
  stages: Partial<Record<FeedingStage, readonly LadderStep[]>>;
};
```

- **Rung scale = `PortionKind` anchor, no new numeric scale.** Order is per-allergen; the unit vocabulary is shared. "pinch-of-egg ≠ pinch-of-celery" is solved by making the *sequence* per-allergen while reusing `PortionKind` as the anchor. Curation surfaced no allergen where `PortionKind` is too coarse.
- **Evaluation checkpoints are authored, not derived.** A curator marks `isEvaluationCheckpoint` per rung (user story #16 requires mid-ladder checkpoints; a "top rung is always evaluation" rule can't express that). "Day N is evaluation day" is replaced system-wide by "rung R is an evaluation checkpoint."
- **Per-rung Czech dose text is inlined as `LadderStep.dose`**, not in `lib/strings/` — a deliberate ADR-0014 deviation for this Czech-only single-tenant app, so a schedule audit is single-file. See `src/lib/domain/canonical-allergen.ts`.

### 2. Current rung = derived, never stored (mirrors ADR-0012)

```
rung = f(allergen's meal-history amounts × that allergen's ladder × evaluation history)
```

Keeping the rung derived preserves the ADR-0012 / ADR-0016 property that the record set is self-describing and single-sourced, and makes rung-skipping inexpressible.

- **Reaction-capping.** The rung tracks *safely-tolerated* reality, not everything ingested. A recorded reaction (an `allergen-test` evaluation whose outcome is not `tolerated`) caps the rung — only doses logged strictly before the earliest such reaction count. A dose that provoked a reaction never advances the ladder.
- **Reaction binding by date.** A `ReintroductionEvaluation` carries no rung id, so a reaction dated D binds to the highest still-live rung whose anchor was logged in a meal on or before D.
- **Feeding stage — breastfed-only today.** Ladders are keyed by `FeedingStage` (`breastfed | mixed | solids`), but the app tracks a breastfed newborn (ADR-0001), so every read resolves through the single `V1_FEEDING_STAGE` constant (`canonical-allergen.ts`). The `mixed`/`solids` ladders are authored ahead of a later release; consumers reference the constant, not the `'breastfed'` literal, so the assumption is greppable.

### 3. LLM picks among legal moves; the engine refuses off-menu

Movement on the ladder is a proposal in the closed `ScheduleProposal` vocabulary (ADR-0026). The LLM's freedom is *which protocol-legal move, when* — **never authoring a portion**. "Menu vs chef": the LLM orders from the menu; the deterministic kitchen refuses off-menu orders. The deep validator (ADR-0026) rejects an illegal move (e.g. skipping a rung) before it can apply. `decideLadderMove` is the single definition of a legal move that the validator reuses.

### 4. Ships first, independently, with no LLM

The ladder is pure/deterministic and LLM-independent, so it is sequenced first — it de-risks everything above it and is testable on its own (F3/F4 deterministic default with no proposer wired).

## 5. Decision engine — `decideLadderMove`

A single pure function `decideLadderMove(input): LadderDecision` in `ladder.ts` composes the derived rung and the read-only gates into one recommendation. It is the F3 ≡ F4 walker — it never branches on phase. It **decides but never writes**; the mother still logs every dose herself.

**One shared replay.** A single private helper (`deriveLadderState`, never exported) replays meals + evaluations in date order **once**, producing `{ liveRung, lastPassingRung, pendingReaction, ceilingRung, reactionCounts }`. `currentRung` projects `liveRung` from it, so `currentRung` and `decideLadderMove` cannot drift and the reaction-binding + step-back logic is written exactly once.

**Phase → cadence injection.** The engine takes `cadenceDays` as an explicit value; the caller sources it from `cadenceForPhase(phase)` in `policy.ts`. The engine never derives F3-vs-F4.

**Gate precedence — most-overriding first.** Safety/clinical gates dominate rhythm gates:

1. permanent elimination → `blocked`
2. floor exhausted or per-rung cap (`MAX_RUNG_REACTIONS`) hit → `ceiling-reached`
3. reaction still in effect → `rest` (window open), then `step-back`
4. checkpoint awaiting a verdict → `hold('awaiting-verdict')` — **retired by §6** ([#500](https://github.com/jirigrill/eczema-helper/issues/500)): the per-rung verdict this waited on no longer gates the engine; `isEvaluationCheckpoint` survives only as a UI nudge and `checkpointVerdictGate` stays exported for that read
5. skin worsened across the stability window → `hold('skin-worsening', baseline→current)`
6. cadence not elapsed → `hold('cadence', daysRemaining)` — the spacing is now **mode-driven** (§6): probe cadence = the injected phase cadence (1 in F4, 3 in F3), confirm `cadence ≥ latency`
7. otherwise → `advance`; at the top, `passed` while the dwell runs, then `settled` once it completes (§6)

A recorded reaction outranks the rhythm gates; skin state outranks cadence (never advance while skin trends worse, even when the clock allows). A **steady baseline is not a hold reason** — mild eczema steady at severity 1 through the window is escalation-eligible; only an *increase* over the window's baseline blocks. The skin gate is `skinStabilityGate(observations, today, stabilityWindowDays)` with `stabilityWindowDays = max(cadenceDays, 3)` (`stabilityWindowFor` in `policy.ts`; the 3-day floor keeps reintroduction's 1-day cadence from shrinking the safety window below a readable trend). `skinCalmGate` remains only as a UI "is there a flare right now?" signal, out of the decision path.

**Reaction → rest → step-back → re-test.** A checkpoint reaction yields `rest(days)` keyed to severity (ADR-0016 `REST_PHASE_DAYS_*`). When the window elapses (`today` past `until`), the engine surfaces `step-back` to the **last-passing rung** (directly below the reacting one) and re-tests — auto-due, but still a mother-logged meal. A clean re-test re-advances: a reaction is a *temporary* setback, not a cap. A rung that reacts `MAX_RUNG_REACTIONS` times, and the floor case (lowest rung reacts, nowhere lower to retreat), unify into the *same* terminal `ceiling-reached`. The engine never converts a terminal into a `permanent-*` status itself (ADR-0012 / ADR-0024) — it defers to human care.

### `LadderDecision` — the verdict vocabulary

A closed discriminated union. Each variant answers a distinct "what now?" that a consumer (simulator today, UI/proposer next) must render or act on differently — the set is minimal, not redundant:

| Variant | Carries | Meaning | Why not merged |
|---|---|---|---|
| `advance` | `from: LadderStep \| null`, `to` | Move up one rung; `from: null` is the first move | Directional + shows both rungs; `from: null` avoids a separate `start` variant |
| `hold` | `rung`, `reason`, optional `daysRemaining` / `baseline+currentSeverity` | Stay put for a *rhythm/awaiting* reason (cadence, skin-worsening, awaiting-verdict) | Discriminates on `reason` internally rather than 3 top-level kinds — the consumer treats "wait" uniformly |
| `rest` | `rung`, `days`, `until` | Reaction recovery window is open; do nothing until `until` | Distinct from `hold`: it is a *reaction* state with a computable due date, not a rhythm wait |
| `step-back` | `from`, `to` | Reaction window elapsed; retreat to last-passing rung and re-test | Opposite direction + different cause from `advance`; renders and reasons differently |
| `passed` | `rung` | Reached and cleared the top rung — ladder complete (success) | A *good* terminal; must not read as `blocked`/`ceiling-reached` |
| `blocked` | *(none)* | Ladder was inert from the start — permanent elimination, or a stage with no rungs | Carries no rung by construction; collapsing into `ceiling-reached` would force a fake rung |
| `ceiling-reached` | `rung` | Stuck: per-rung cap or floor exhaustion — defer to clinician (a *bad* terminal) | Distinct from `passed` (failure vs success) and from `blocked` (has a rung, was walked) |

**Are all needed / can they be optimized?** Yes, all seven are load-bearing and the union is already close to minimal:

- `blocked` vs `ceiling-reached` vs `passed` are three genuinely different terminals — never-started, stuck-with-a-rung, and completed-at-top. They render different copy and gate different follow-ups; merging any pair loses information a consumer needs (a rung that doesn't exist for `blocked`, success-vs-failure for the others).
- `advance` / `step-back` and `hold` / `rest` are the two direction/cause pairs. They look mergeable but aren't: direction and cause drive different UI and different downstream engine behaviour (`rest` has a due date; `step-back` triggers a re-test).
- The one deliberate *compression* already made: the three "wait" reasons are folded into `hold`'s `reason` discriminant rather than three top-level kinds. This is the right axis — consumers branch on "advance vs wait vs retreat vs terminal" first, then on reason.

The **v2 reshape (§6)** adds three variants (`settled`, `adapting-decelerate`, `suspected-reaction`) and turns `ceiling-reached` into `ceiling-reached { reason }`. That is additive, not a re-cut of the existing seven; see §6 and [#498](https://github.com/jirigrill/eczema-helper/issues/498).

### Why flat variants, not ~4 nested kinds

Ten flat variants invites the reasonable objection *"that's over-modeled — this is really move / pause / decide / done."* That collapsed view is correct at the **concept** level, and the ten variants are indeed three-or-four concepts wearing more hats: `advance`/`step-back` are one *move* split by direction; `hold`/`rest`/`adapting-decelerate` are one *pause* split by cause (wait vs stop vs keep-dosing-flat); `passed`/`blocked`/`ceiling-reached` are one *terminal* split by reason. The information is irreducible — each split drives a different instruction to the mother or a different screen — but it could be packaged as ~4 top-level kinds with discriminated payloads (`{ kind: 'move'; direction } | { kind: 'pause'; mode } | { kind: 'decide' } | { kind: 'terminal'; outcome }`).

**We keep the flat union deliberately, for one reason: compiler-enforced exhaustiveness on the cases where correctness is safety-critical.** With flat kinds, a `switch (kind)` forces every consumer (the `formatVerdict` render, the future confirm UI, ADR-0026's deep validator) to handle every state — so *"never offer 'advance' after a `ceiling-reached { severe }`"* is a compile error if missed, not a runtime bug. Nesting moves the dangerous distinctions (`severe` vs `floor-exhaustion`; `reaction-rest` vs `adapting`) *inside* a payload the top-level switch doesn't check unless every consumer also writes a second exhaustive inner switch. The flat shape is uglier to read but strictly safer, and safety dominates for a tool dosing an infant.

The "it's really ~4 buckets" intuition is served **as a derived projection, not by re-cutting the union**: a `summarize(decision): 'progressing' | 'waiting' | 'needs-you' | 'done'` helper gives the UI its coarse view over the fine-grained union without discarding the payload the engine and validator need. Coarse for humans, precise for the compiler.

Do not "simplify" this union into nested kinds without replacing the lost per-payload exhaustiveness — the flatness is load-bearing, not an oversight.

Applying a verdict, and any UI rendering, is out of scope for the engine (PRD #423 / a follow-up UI pass). `scripts/simulate.ts` drives the engine and prints a `verdict:` line per allergen; its scripted `scenario`s assert the reshaped verdicts against the engine — see the parity table in §6.

## Consequences

- New authored ladder data per protocol allergen (curation units, like the reintroduction protocol).
- A **ladder-override** Dexie table (ADR-0006) holds per-allergen deviations from the default ladder; added to the encrypted export snapshot ([#438](https://github.com/jirigrill/eczema-helper/issues/438)).
- Ladder versioning + migration on default-ladder improvement is not yet implemented.

## 6. Clinical reshape (accepted design; partly built)

The reshape refines the reaction handling in §5. It has two halves:

- **Escalation** (probe/confirm walk, walk-down on reaction, `settled`, `cadence ≥ latency`) — a sound deterministic menu of legal moves the §3 proposer picks among. Scoped in [PRD #454](https://github.com/jirigrill/eczema-helper/issues/454).
- **Reaction detection/attribution** (*is this flare a reaction, and to which rung?*) — reshaped by wayfinder map [#491](https://github.com/jirigrill/eczema-helper/issues/491). Its decisions are recorded below.

Where built, this supersedes the reaction/cadence semantics in §5 on conflict.

### The engine emits a hold; it never auto-bans

A flare during reintroduction has three possible causes — the food, an external confounder (teething / illness / heat / new irritant), or benign adaptation. Skin data alone cannot separate them; only the following days' trajectory can. So the engine **must not** collapse a threshold crossing into `reaction → walk-down → ban`:

- The region-aware detector (`stop = (maxRegionΔ ≥ 2) OR (regionsWithΔ≥1 > 0.5 × trackedRegions)`) is a **tripwire, not an auto-verdict**. Crossing it raises a first-class **`suspected-reaction` hold** carrying what a judge needs: skin geometry + nearby `Event`s + the food's authored `allergenicity`.
- The **mother is the constitutional judge of record** (ADR-0016). A reaction verdict re-enters only as an ordinary **`ReintroductionEvaluation`** row she confirms; on the next replay it resolves the hold (walk-down, or clears). `decideLadderMove` stays a pure replay of confirmed rows and never touches the network (ADR-0024).
- An **LLM (online) or deterministic heuristic (offline) drafts** the verdict the mother one-taps. The draft lives only at the UI/proposal edge (ADR-0026); the engine never knows who drafted the row.

### The adaptation window — a first-class derived state

Between "clean advance" and "reaction → walk-down" sits a **decelerated-continuation** state. `deriveLadderState` gains a `pendingAdaptation` replay state and `decideLadderMove` a variant **`adapting-decelerate`** (emitted only while the window is open):

- **Opens** on: first contact with the food **+** a sub-threshold flare **+** authored **`allergenicity: 'low'`**. High-allergen foods, and any threshold-crossing day-1 flare, go straight to the reaction path.
- **Response:** hold the dose flat, keep re-dosing, **never push through** (this is not OIT — supervised-care territory, ADR-0024).
- **Exits** (window = 2 days, tunable): crosses threshold → reaction (walk-down); trending down → `settled` (dose kept, resume in confirm cadence, never fast probe); ambiguous middle → `suspected-reaction` hold, defer to the mother.

Adaptation stays **fully derived** (ADR-0012, no drift); the only authored addition is the `allergenicity` field. It is an **intrinsic property of the allergen, not the dose progression**, so it lives on the `CanonicalAllergen` record (optional `allergenicity`), *not* on `Ladder` — authored only where a `ladder` is present (the adaptation window it gates exists only during reintroduction) and paired with it by a catalog invariant test. Landed in [#499](https://github.com/jirigrill/eczema-helper/issues/499) (type + curated placeholder data, no engine consumer yet).

### Severe reactions (resolved 2026-07-17)

A `severe-reaction` is a **real engine-visible verdict** (picked on the confirm screen alongside mild/clear); `decideLadderMove` branches on it. Confirming it derives the terminal **`ceiling-reached { reason: 'severe' }`** — the existing defer-to-human terminal, with a discriminated `reason: 'floor-exhaustion' | 'severe'` so severity survives in the engine *output* rather than being rehydrated from the row. It does **not** walk down + re-confirm — re-exposing the child after a dangerous reaction is exactly what must not happen at home.

- **Same path, no bypass.** Severe routes through the ordinary `suspected-reaction` hold → mother-confirmed row. The **call-155 redirect + urgent raw-log fire independently at log-time** via ADR-0024's offline stem floor — they never wait on the ladder verdict, so the verdict stays parent-attributed and calm ("confirmed later, calmly", ADR-0024 §D).
- **Strictly absorbing.** The engine never schedules a re-challenge out of `ceiling-reached { reason: 'severe' }`; the only exit is a human changing the facts (doctor clears it → mother edits/removes the row or adds a `ladder_override`), after which replay re-derives. Identical to `floor-exhaustion`; the two differ only in Czech copy + the redirect that already fired.

The **regulatory** question (is generated rationale "medical advice" under EU MDR, ADR-0024 §B) is a separate legal determination, untouched here; the **Czech copy** for the severe terminal is a UI/strings task.

### Ship-now cut line

The ship-now boundary is the **`suspected-reaction` hold**, *not* the escalation-vs-detection split (a naive "escalation now, detection later" would ship an auto-banning walk-down this section already rules illegal, only to tear it out).

- **Ships now** (re-scoped PRD #454 — the derived, LLM-free engine up to the hold): probe/confirm (incl. adaptation-window entry), `settled`, `cadence ≥ latency` unchanged, the walk-down mechanic driven by a *confirmed* `ReintroductionEvaluation` row, the detector demoted to a tripwire, `pendingAdaptation` + `adapting-decelerate`, and `suspected-reaction` as a first-class decision. **Landed so far** ([#500](https://github.com/jirigrill/eczema-helper/issues/500)): the escalation half — probe/confirm mode + `cadence ≥ latency` + top-rung dwell → `settled` + the retired checkpoint hold. Reactions still flow through the v1 verdict path (rest/step-back/ceiling); walk-down, the tripwire detector, `pendingAdaptation`/`adapting-decelerate`, and `suspected-reaction` are still pending.
- **Waits** (execution/UI, ADR-0026): the draft path (LLM/heuristic pre-fill), draft caching, the confirm UI, the BFF/prompt.

**`cadence ≥ latency` is untouched by the seam** — it is a dosing-safety rule (never dose up into a brewing delayed reaction), not an attribution convenience. The seam decides *whether* a flare is a reaction, never *which rung* or *how fast to dose*.

### Simulator parity expectations

`scripts/simulate.ts` is the end-to-end parity harness for the reshaped engine ([#505](https://github.com/jirigrill/eczema-helper/issues/505)). It invents no logic — it drives the mother's real REPL commands and reads back `decideLadderMove`, so a green scenario is a parity check against the domain engine itself. Run `scenario all` (or `scenario <name>`) inside `just simulate`; each scenario asserts a *verdict tag* (the variant `kind` plus the inner discriminant that `hold` and `ceiling-reached` carry).

This table is the parity contract: every reshaped verdict, the scenario that exercises it, and whether the engine emits it today or the variant is still type-only scaffolding.

| Verdict tag | Scenario | Status |
|---|---|---|
| `advance` (probe, 1-day gap) | `probe-to-confirm` | emitted |
| `hold:cadence` (confirm ≥ latency at the top) | `probe-to-confirm` | emitted |
| `passed` → `settled` (top-rung dwell, N = default steps) | `dwell-to-settled` | emitted |
| `rest` (delayed reaction binds to one rung under confirm cadence) | `delayed-attribution` | emitted |
| `rest` → `step-back` (reaction recovery → re-test below) | `walk-down-and-retest` | emitted |
| `ceiling-reached:floor-exhaustion` (lowest rung reacts) | `floor-exhaustion` | emitted |
| `ceiling-reached:floor-exhaustion` (per-rung cap = `MAX_RUNG_REACTIONS`) | `per-rung-cap` | emitted |
| `hold:skin-worsening` (trend gate outranks cadence) | `skin-worsening-hold` | emitted |
| `blocked` (permanent elimination) | `permanent-blocked` | emitted |
| `adapting-decelerate` (adaptation window: open + trending-down / crossing / ambiguous exits) | *pending* | scaffolded — [#503](https://github.com/jirigrill/eczema-helper/issues/503) |
| `suspected-reaction` (region-detector tripwire: crossing + non-crossing) | *pending* | scaffolded — [#502](https://github.com/jirigrill/eczema-helper/issues/502) |
| `ceiling-reached:severe` (confirmed severe reaction — strictly absorbing) | *pending* | scaffolded — [#504](https://github.com/jirigrill/eczema-helper/issues/504) |

`formatVerdict` renders **every** variant above — including the three scaffolded ones — so the exhaustive switch stays green as the union's emitters land. The three *pending* rows cannot be driven as scenarios yet: `decideLadderMove` does not emit them (the adaptation window, the region-aware detector, and the severe terminal are unbuilt), and the harness must not fake an engine effect the engine does not produce. The one authored input the adaptation window will gate on — `allergenicity` — is already surfaced per allergen in the render, so those scenarios become drivable the moment their emitters (#502–#504) land; this table then gains their scenario names.
