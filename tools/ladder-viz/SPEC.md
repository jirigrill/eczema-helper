# Ladder-engine visualizer — build spec

Hand-off spec for a **single build session**. Assembled from wayfinder map
[#518](https://github.com/jirigrill/eczema-helper/issues/518) and its five resolved
tickets ([#519](https://github.com/jirigrill/eczema-helper/issues/519),
[#520](https://github.com/jirigrill/eczema-helper/issues/520),
[#521](https://github.com/jirigrill/eczema-helper/issues/521),
[#522](https://github.com/jirigrill/eczema-helper/issues/522),
[#523](https://github.com/jirigrill/eczema-helper/issues/523)). Everything here is
**decided** — build against it. The one deliberately-deferred item is called out under
[§9 Open follow-ups](#9-open-follow-ups); nothing else is left to decide.

The prototype ([draft PR #525](https://github.com/jirigrill/eczema-helper/pull/525))
is throwaway evidence for the library choice only. **Start the real build fresh against
this spec** — reuse the library + toolchain wiring it settled, not its hand-authored
cascade data.

---

## 1. Overview

A **standalone ladder-engine visualizer** under `tools/ladder-viz/` — *not shipped*,
same category as `scripts/simulate.ts`. It drives the pure domain
(`src/lib/domain/ladder.ts`) and makes the engine's behaviour **visible** on a web page.

It renders the dose-escalation ladder engine — `decideLadderMove` and its private
`deriveLadderState`, plus the gates in `ladder.ts` — for one allergen's run. It has:

- **Two modes** — **manual** (drive by hand: log meal / skin / eval, advance day) and
  **scenario replay** (pick a canned journey, play it back). Same rendering over two
  event sources ([§7](#7-two-modes--manual-and-scenario-replay)).
- **Two nested views** — a top-level **state-machine journey** of the run
  ([§5](#5-view-1--the-journey-state-machine)), and **click any day → drill into that
  decision's cascade** ([§6](#6-view-2--the-per-decision-cascade-drill-in)).

It renders **truth** via a new engine **explain/trace seam**
([§4](#4-the-engine-seam--explainladdermove)) — never an outside reconstruction. Library:
**Svelte Flow** ([§3](#3-toolchain-wiring)).

**Read before building:** ADR-0023 (§decision-engine, §6), ADR-0012 (derived, never
persisted), PRD #445, and `scripts/simulate.ts` (closest prior art — drives the same
pure functions, traces every internal call).

---

## 2. What to build (checklist)

1. **Engine seam** in `src/lib/domain/ladder.ts` — refactor `decideLadderMove`'s body
   into an internal `walkLadderPrecedence`, add `explainLadderMove` + exported types
   ([§4](#4-the-engine-seam--explainladdermove)). This is the only production-code change.
2. **`tools/ladder-viz/` app** — Svelte + Vite, separate root
   ([§3](#3-toolchain-wiring)).
3. **Journey view** — day-spine state-machine graph in Svelte Flow
   ([§5](#5-view-1--the-journey-state-machine)).
4. **Cascade drill-in** — click a day → 6-step precedence panel
   ([§6](#6-view-2--the-per-decision-cascade-drill-in)).
5. **Two modes** — scenario replay + manual, over one shared event-stream shape
   ([§7](#7-two-modes--manual-and-scenario-replay)).
6. **Scenario loader** — Zod-validated YAML in `tools/ladder-viz/scenarios/`
   ([§8](#8-event-sources)).
7. **7 canonical scenarios** ([§8](#8-event-sources)).
8. **`just viz` recipe** + docs housekeeping ([§3](#3-toolchain-wiring),
   [§4](#4-the-engine-seam--explainladdermove)).

---

## 3. Toolchain wiring

Settled in [#522](https://github.com/jirigrill/eczema-helper/issues/522). The visualizer
is never shipped, so it lives outside SvelteKit:

- **Separate Vite root** at `tools/ladder-viz/vite.config.ts` — not a SvelteKit route.
- **Own `tools/ladder-viz/tsconfig.json`** — does *not* extend `.svelte-kit/tsconfig.json`.
  Root `tsconfig.json` **excludes `tools/`**.
- **`just viz` recipe:** `bunx vite dev --config tools/ladder-viz/vite.config.ts`.
- **`$lib` import boundary:** the tool's Vite config aliases `$lib` → `../../src/lib`,
  mirroring `svelte.config.js`, so the visualizer imports domain types/functions
  read-only (e.g. `explainLadderMove`, `LadderDecision`).
- **Svelte + Vite, no Tailwind** — graph + side panel + variant bar don't warrant it.
- **Library:** Svelte Flow (`@xyflow/svelte`) — native `onnodeclick` + free pan/zoom.
  (Mermaid was rejected: `stateDiagram-v2` has no `click` directive, no built-in
  pan/zoom.)

---

## 4. The engine seam — `explainLadderMove`

Settled in [#521](https://github.com/jirigrill/eczema-helper/issues/521). The visualizer
renders engine truth by reading a single new export. **One walker, shared** so the seam
and the decision path cannot drift.

### Shape

```ts
function walkLadderPrecedence(input: LadderDecisionInput): {
  decision: LadderDecision;
  snapshot: LadderStateSnapshot;
  steps: LadderPrecedenceSteps; // fixed 6-tuple, precedence order
} { /* today's decideLadderMove body, instrumented */ }

export function decideLadderMove(input: LadderDecisionInput): LadderDecision {
  return walkLadderPrecedence(input).decision; // unchanged signature + behavior
}

export function explainLadderMove(input: LadderDecisionInput): LadderExplain {
  return walkLadderPrecedence(input); // { decision, snapshot, steps }
}

type LadderExplain = {
  decision: LadderDecision;
  snapshot: LadderStateSnapshot;
  steps: LadderPrecedenceSteps;
};
```

### `steps` — fixed 6-tuple, precedence order

Never a variable-length array (so a step can never be silently omitted). Order is
`decideLadderMove`'s actual precedence:

```
permanent-or-empty → ceiling → reaction → skin-worsening → cadence → advance-or-dwell
```

```ts
type LadderPrecedenceStepName =
  | 'permanent-or-empty' | 'ceiling' | 'reaction'
  | 'skin-worsening' | 'cadence' | 'advance-or-dwell';

type LadderPrecedenceStepStatus =
  | 'not-reached' | 'fired' | 'passed-confirmed' | 'passed-no-data';

type LadderPrecedenceStep = {
  name: LadderPrecedenceStepName;
  status: LadderPrecedenceStepStatus;
  detail: LadderPrecedenceStepDetail; // discriminated by name
};

type LadderPrecedenceStepDetail =
  | { step: 'permanent-or-empty' }
  | { step: 'ceiling' }
  | { step: 'reaction' }
  | { step: 'skin-worsening'; gate: SkinStabilityGateResult; windowDays: number }
  | { step: 'cadence'; gate: CadenceGateResult; cadenceDays: number } // *effective*, mode-adjusted
  | { step: 'advance-or-dwell' };
```

**Status resolution:**
- `fired` — this step produced the verdict.
- steps *after* the one that fired → `not-reached`.
- steps that pass without firing → `passed-confirmed`, **except** the two gate-backed
  steps (skin-worsening, cadence) which can also report `passed-no-data` when the gate is
  permissive by default absent data. The four structural steps
  (permanent-or-empty, ceiling, reaction, advance-or-dwell) evaluate a definite fact from
  the replay and never report `passed-no-data`.

**Detail avoids duplication:** gate-backed steps carry the gate's own result fields paired
with the **effective** threshold (`cadenceDays` after `effectiveCadenceDays(mode, …)`;
`windowDays`/`stabilityWindowDays`) — neither gate returns its own threshold today, so the
walker pairs them. Structural steps carry no payload; their evidence is the field already
in the snapshot below, which a renderer cross-references rather than the seam repeating.

### `snapshot` — shown once

```ts
export type LadderStateSnapshot = {
  liveRung: LadderStep | null;
  pendingReaction: PendingReaction | null;
  ceilingRung: LadderStep | null;
  mode: LadderMode;
  dwell: Dwell;
};
```

All 5 fields **always present**, explicit `null`s — never omitted for "nothing to
report." A **purpose-built projection**, not `deriveLadderState`'s internal
`LadderReplayState` (which also carries `lastPassingRung` and a `reactionCounts` Map —
internal bookkeeping kept private so the replay can grow without widening the public
surface). Mapped once inside the walker.

### `decision` — raw, unmodified

`decision: LadderDecision` is returned as-is. The seam **does not synthesize prose**; the
visualizer dumps whatever fields are present on the variant that fired.

### Build tasks for the seam

- Refactor `decideLadderMove`'s body into `walkLadderPrecedence`; keep
  `decideLadderMove`'s exact signature + behavior.
- Export `explainLadderMove`, `LadderExplain`, `LadderStateSnapshot`, and newly export
  `PendingReaction` + `Dwell` (no field changes).
- `deriveLadderState` and `LadderReplayState` stay **private**.
- **Migrate `scripts/simulate.ts`** onto the seam: it currently calls `cadenceGate` and
  `skinStabilityGate` directly (`scripts/simulate.ts:434-465`) — an outside reconstruction
  that is exactly the drift risk the seam exists to prevent. Its per-render trace should
  read `steps`/`snapshot` from `explainLadderMove` instead. `skinCalmGate` and
  `checkpointVerdictGate` are **not** in the precedence (retired per ADR-0023 §6) —
  `simulate.ts` may keep tracing those as auxiliary calls (no decision-path drift risk).
- **Docs:** one-liner in `docs/decisions-log.md` (additive read-only exposure — does *not*
  clear the ADR bar). Add `UBIQUITOUS_LANGUAGE.md` entries for `explainLadderMove` and the
  precedence step names.

---

## 5. View 1 — the journey state machine

Settled in [#519](https://github.com/jirigrill/eczema-helper/issues/519). One state
machine per **allergen's run**. **Situation-centric** (framing B): a node is a *situation
the run is in*, with the rung carried inside as node data — not a literal ladder-climb
graph, because a `rest` and a `hold` both leave you on the same rung, and a rung-graph
would render the tool's most interesting moments as "nothing happened."

### Nodes — inherited 1:1 from `LadderDecision` (Way A, fully discriminated)

Every fully-discriminated union arm is its own box; the visualizer renders whatever
`kind`/`reason` the engine hands it. The mapping is an **exhaustive switch** — a new
unmapped engine kind breaks the build rather than being silently dropped.

**9 emitted today:**

| Box | `LadderDecision` |
|---|---|
| `climbing` | `advance` |
| `holding-cadence` | `hold / cadence` |
| `holding-skin` | `hold / skin-worsening` |
| `resting` | `rest` |
| `stepped-back` | `step-back` |
| `dwelling` | `passed` |
| `settled` ✓ | `settled` |
| `ceiling-floor-exhaustion` ✗ | `ceiling-reached / floor-exhaustion` |
| `blocked` | `blocked` |

**3 in the vocabulary, never light up yet** (PRD #454, not emitted by `decideLadderMove`
today) — render **greyed**, so the spec is future-complete: `adapting-decelerate` ·
`suspected-reaction` · `ceiling-severe` (`ceiling-reached / severe`).

**1 synthetic entry node** — `not-started`, the graph's entry point, invented by the
visualizer (the engine only speaks once there's history); no backing engine outcome.

### Render shape — day-spine, events nested

- **Days are the state-bearing nodes** (the spine); the events logged that date
  (dose / verdict / skin reading) nest **inside** the day node as ordered evidence.
- **The box resolves once per day.** `decideLadderMove` takes `today` as a *date* + full
  history — it can't flip between two same-date events. If a dose and a reaction land the
  same day, precedence decides and the day lands on one box (e.g. `resting`), with both
  events shown inside as evidence.
- **Day-by-day replay; collapse consecutive identical boxes** (as `scripts/simulate.ts`
  already does). This is the only replay model that renders **time-triggered**
  transitions (rest expiring, cadence elapsing, dwell completing) — event-driven replay
  would miss them because no event fires.

### Edges — the engine's 4 input channels

An edge is simply the **day-boundary where the box changed**. No decision kind is an
"edge"; every daily verdict *is* the day's box. The edge trigger = one of the 4
`LadderDecisionInput` channels, nothing finer:

| Trigger | Source |
|---|---|
| `meal` (dose / anchor) | `meals: Meal[]` |
| `eval` (verdict) | `evaluations: ReintroductionEvaluation[]` |
| `observation` (skin) | `observations: SkinObservation[]` |
| `time` (`today` advancing) | `today: string` |

"rest expired / cadence elapsed / dwell latency met" are **not** separate triggers — all
`time` advancing; which threshold crossed is the engine's internal reasoning. The
fine-grained per-edge **"why"** is the cascade drill-in
([§6](#6-view-2--the-per-decision-cascade-drill-in)) via the seam — no separate
reason-vocabulary invented here.

### Terminals — engine truth (the load-bearing structural facts)

- **`ceiling-reached` — hard-absorbing.** `ladder.ts:200` (`if (ceilingRung) break;`)
  stops the replay reading events entirely. No edges out.
- **`blocked` — hard-absorbing.** Static condition (permanent elimination / empty stage
  ladder), checked before replay; permanent.
- **`settled` — reversible terminal.** Recomputed every replay; `ladder.ts:230` resets the
  dwell to `NO_DWELL` on *any* reaction. Draw as a success endpoint (green ✓) but keep the
  one honest edge **`settled → resting`**, so a late top-rung reaction re-opening the run
  renders truthfully.

**No adjacency matrix.** Reachable edges are whatever day-by-day replay produces —
hard-coding a which-box-follows-which table would drift. The only documented structural
constraints are the three terminal rules above (`ladder.ts:200` absorbing,
`ladder.ts:230` reversible).

---

## 6. View 2 — the per-decision cascade drill-in

Settled in [#520](https://github.com/jirigrill/eczema-helper/issues/520). **Click any day
node → drill into that day's resolved decision.** The drill-in target is the day's
resolved verdict; the events nested in the day are the evidence. Content is
library-independent (the prototype's shared `CascadePanel.svelte` confirmed this) and maps
1:1 onto the seam's `explainLadderMove(input)` return.

### Layout — cascade-first

1. **One derived-state snapshot up front** — all 5 `LadderStateSnapshot` fields, explicit
   `null`s shown, never omitted.
2. **All 6 precedence steps, always shown, in order** — with the **verdict rendered inline
   at the firing step**.

### Per-step shape — uniform

Each step renders its `status` from the four-value vocabulary
(`not-reached | fired | passed-confirmed | passed-no-data`). Gate-backed steps
(skin-worsening, cadence) show their **gate signals paired to the effective threshold**
(from the seam's `detail`). Structural steps carry no payload — cross-reference the
snapshot field, don't repeat it.

### Verdict rendering

**Raw field dump of the `LadderDecision` variant that fired — never synthesized prose.**
Whatever fields are present on the variant, dumped as-is.

---

## 7. Two modes — manual and scenario replay

Settled in [#523](https://github.com/jirigrill/eczema-helper/issues/523). Both are views
over the **same event-stream shape**, so the journey/cascade rendering never needs to know
which mode produced the day it's showing.

- **Scenario replay** — pick a canned journey ([§8](#8-event-sources)), play it back.
- **Manual** — mirrors the scenario format *exactly*, not a free-form live editor:
  - **Run setup, fixed at session start** — same fields as a scenario header: `allergen`,
    `phase`, `stage`, `permanent`. **Not changeable mid-run** (unlike
    `scripts/simulate.ts`'s live `stage`/`phase`/`permanent` switches — deliberately *not*
    carried over).
  - **Per-day actions** — identical to the 3 scenario event kinds: log meal
    (amount | none), log skin (0-3), log eval (outcome) — applied to "today" — plus
    **advance to next day**.

---

## 8. Event sources

Settled in [#523](https://github.com/jirigrill/eczema-helper/issues/523).

### Scenario format

- **Location:** `tools/ladder-viz/scenarios/*.yaml`.
- **Validation:** YAML parsed and validated against a **Zod schema at load time** (YAML
  gets no compile-time check; catch typos loudly). Chosen over a TS array literal and over
  a flat string-DSL.

```yaml
allergen: dairy
phase: tolerance-building   # tolerance-building | reintroduction
stage: breastfed
permanent: false            # optional, default false — set only at start (no mid-run event)

days:
  - date: 2026-06-01
    events:
      - meal: pinch          # amount only — allergen comes from the header; or `meal: none`
      - skin: 1               # 0-3
  - date: 2026-06-02
    events: []                 # empty/missing events supported — a day where nothing was logged
  - date: 2026-06-04
    events:
      - eval: mild-reaction   # tolerated | mild-reaction | clear-reaction | severe-reaction
```

- **Header** (`allergen`, `phase`, `stage`, `permanent?`) is **fixed for the whole file** —
  one file = one full runnable journey.
- **Body** is `days: [{date, events}]`. Days are the state-bearing unit (mirrors §5's
  day-spine); events nest inside a day.
- **Strict, consecutive, ascending dates — enforced, not inferred.** The author lists
  **every calendar day explicitly** (empty/missing `events` = "nothing logged, time still
  passing"). The tool does **no gap-filling or reordering**. A duplicate, out-of-order, or
  skipped date is a **load error**. Deliberate: some transitions (a cadence hold lifting, a
  rest window expiring) fire with *no event*, purely from `today` advancing — per §5 only
  day-by-day replay renders those, so every day that matters must be a real, visible entry.
- **Event vocabulary is 3 kinds:** `meal` (amount | `none`), `skin` (0-3), `eval`
  (outcome). No `stage`/`phase`/`permanent` mid-run events — fixed at the header.

**What `eval` represents:** a `ReintroductionEvaluation` — the mother's voluntary
checkpoint verdict on a dose. *Not* engine-requested (the
`checkpointVerdictGate`/`isEvaluationCheckpoint` block is retired from the decision path
per ADR-0023 §6; `isEvaluationCheckpoint` only drives a UI nudge). `eval` drives reactions
in the replay (`ladder.ts:181-251`): a non-`tolerated` eval binds to the highest live rung
and creates the `pendingReaction` that produces `rest`/`step-back`/`ceiling-reached`.
`skin` is an independent signal feeding `skinStabilityGate` — it does not itself trigger a
reaction.

### Canonical scenario set — 7 scenarios

1. **Clean climb → settled (dwell).** No reactions: doses climb every rung at
   cadence-respecting intervals, arrive at the top rung, repeat top-rung doses until dwell
   latency completes → `settled`. Include a couple of `skin` readings to show that channel
   coexisting with a clean run. Exercises `climbing` → `dwelling` (`passed`) → `settled`.
2. **Reaction → rest → step-back → re-climb.** Climb a few rungs cleanly,
   `eval mild-reaction` at the current rung → `rest` (holds while `today ≤ until`); once
   the rest window passes → `step-back` to the prior rung; a clean re-dose + eval there,
   then climb back past the rung that reacted. Exercises
   `climbing` → `resting` → `stepped-back` → `climbing`.
3. **Floor-exhaustion ceiling.** A reaction at the lowest rung (`liveIndex === 0`) —
   nowhere lower to retreat to → immediate `ceiling-reached(floor-exhaustion)`, no
   rest/step-back cycle.
4. **Per-rung cap ceiling.** Builds on scenario 2's shape: after the step-back and re-climb
   back to the same rung, a **second** reaction at that same rung —
   `MAX_RUNG_REACTIONS = 2` (`policy.ts:129`) — triggers
   `ceiling-reached(floor-exhaustion)` even though it isn't the floor rung, demonstrating
   it's the per-rung count, not the floor, that terminates.
5. **Skin-worsening hold.** Climb a couple rungs, a stable-baseline `skin` reading
   (severity 1 — *not* `0`, to show a steady non-zero baseline alone is not a hold reason
   per `ladder.ts:634-636`), then a later `skin` reading at severity 2 within the stability
   window → `hold(skin-worsening)` even though cadence would otherwise allow advancing.
   Skin then settles back down and climbing resumes.
6. **Cadence hold (probe mode).** A dose logged, then a day inside the cadence window
   (probe-mode, fast cadence) with no new dose → `hold(cadence, daysRemaining)`. Once the
   window elapses with skin stable and no reaction, the hold lifts and climbing resumes.
7. **Blocked/permanent (from day one).** Header `permanent: true` from the start →
   `blocked` immediately, absorbing regardless of any events logged afterward.

---

## 9. Open follow-ups

Everything needed to build is decided. One item was **deliberately deferred** during
charting and is *not* a blocker — build the 7 scenarios above; add this only if a gap
shows up:

- **`settled → resting` re-open scenario (8th canonical scenario).** A late top-rung
  reaction *after* scenario 1 reaches `settled`, resetting the dwell per `ladder.ts:230` —
  the state machine's only reversible terminal (§5). [#519](https://github.com/jirigrill/eczema-helper/issues/519)
  flagged it as worth covering; [#523](https://github.com/jirigrill/eczema-helper/issues/523)
  chose to keep the canonical set at 7 rather than ship it as an 8th scenario or extend
  scenario 1. The `settled → resting` **edge** is already part of the journey render
  contract regardless (§5 terminals) — this is only about whether a *canonical scenario*
  exercises it. Revisit if the build exposes a gap.

No other decisions remain open.
