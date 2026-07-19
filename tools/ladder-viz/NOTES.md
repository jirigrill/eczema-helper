# Prototype notes — ticket #522

Throwaway ladder-engine inspector under `tools/ladder-viz/`. Run: `just viz`,
open `http://localhost:5180/`.

## What this is

A single-screen developer inspector for the ladder decision engine. Two zones,
condensed: a left **situation** column (ladder + the day's inputs, plus a manual
editor in manual mode) and the engine **pipeline** resolving to the verdict on
the right. The date strip on top is pure calendar navigation.

1. **Date strip on top** — pure calendar nav, nothing else (arrows + ←/→ keys).
2. **Clearly visible user inputs** — the left column renders the meals / skin /
   reaction logged on the selected day as cards (dose pill, severity chip, tone).
3. **Engine as a state machine** — the pipeline (Svelte Flow) renders the fixed
   6-step precedence as a **locked, single-column** canvas (no pan / no zoom / no
   drag; it re-frames itself on expand). Each node is titled with the **real code
   identifier** it evaluates (`skinStabilityGate()`, `cadenceGate()`,
   `deriveLadderState().pendingReaction`, …), shows its output, and **unrolls its
   full inputs on click**. The firing node is tone-highlighted; short-circuited
   nodes are dimmed.
4. **Overall engine output** — the verdict node terminates the column; a pill in
   the header echoes it.
5. **Whole ladder + current run** — the ladder rail draws every rung persistently
   with the live rung highlighted (never re-flows; only the highlight moves).
6. **Smart screen use** — two zones, related things grouped, nothing stranded in
   a far corner.

### Manual mode

A `scenario ↔ manual` toggle in the top bar. **Manual** swaps the canned events
for an empty set and shows an editor on the left: pick a dose (rung), a skin
severity (0–3), or a reaction verdict for the selected day — one of each per day,
click the active one to clear it. Every entry flows through the *same*
`computeDay` → `decideLadderMove` path as the scenario, so you can hand-drive the
real engine day by day and watch the pipeline respond.

## Driven by the REAL engine

Unlike the first (library-selection) prototype, every verdict + gate reading is
produced by the actual domain functions in `src/lib/domain` — `decideLadderMove`,
`currentRung`, `cadenceGate`, `skinStabilityGate`, `nextLegalStep`. Only the
*scenario* is canned: one allergen (peanut), a real 4-rung `Ladder`, and a
~28-day history (`engine.ts`) authored to walk a real spread of the union —
advance → cadence-hold → skin-worsening hold → rest → step-back → tolerated-clear
→ re-climb → passed (top) → late reaction re-opens.

`other:<allergenId>` food ids let meals register as doses without wiring the food
catalog (the engine's `foodTriggers` slices the prefix).

### Faithfulness caveat (the #521 seam)

The engine returns only the final `LadderDecision`, not a per-step trace. So the
6-step trace here is **reconstructed** from the public gates + the real verdict —
exactly what `scripts/simulate.ts` already does. Two derived values (`mode`, and
therefore the effective cadence) are recomputed with the documented rule because
`deriveLadderState` is private. The UI flags this ("trace reconstructed from
public gates — #521 seam pending"). When the explain/trace seam (#521) is built,
the real visualizer should read the trace from it and delete this reconstruction.

## Toolchain wiring (unchanged from the library decision)

- Standalone Vite root `tools/ladder-viz/vite.config.ts`, `$lib` → `src/lib`
  alias (import-only), `just viz` recipe.
- `just viz` runs `svelte-kit sync` first: importing real values from `src/lib`
  makes Vite resolve the repo-root tsconfig, whose `extends` needs the generated
  `.svelte-kit/tsconfig.json`.
- Svelte + Vite, `@xyflow/svelte`, no Tailwind — the tool wears a technical
  inspector theme (`theme.css`), deliberately not the consumer app's design
  system.

## Not built / deferred to the real build (ticket #524)

- `settled` / `blocked` / `ceiling-reached` arms aren't exercised by this
  scenario (settled needs a long top-rung dwell; blocked/ceiling need special
  setup). The rendering handles them — the scenario just doesn't reach them.
- Node layout: positions are computed by hand (cumulative height math driving
  fitView), not a layout engine — fine for a fixed 6-step column.
- Throwaway: **not** meant to be built on directly; it's the design evidence for
  the ticket. The real visualizer starts fresh against the assembled spec.
