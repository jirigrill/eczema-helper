# Prototype notes — ticket #522

Throwaway ladder-engine inspector under `tools/ladder-viz/`. Run: `just viz`,
open `http://localhost:5180/`.

## What this is

A single-screen developer inspector for the ladder decision engine, built to
six requirements:

1. **Date strip on top** — scrub the calendar forward/back (arrows + ←/→ keys);
   each day tinted by that day's verdict so the run's arc is legible at a glance.
2. **Clearly visible user inputs** — right rail shows the meals / skin / reaction
   the mother logged on the selected day (the raw evidence).
3. **Engine as a state machine** — center canvas (Svelte Flow) renders the fixed
   6-step precedence pipeline; each step is a node showing its **inputs → output**,
   the firing step highlighted (tone-colored), short-circuited steps below it
   dimmed, resolving into the verdict node.
4. **Overall engine output** — the verdict node terminates the pipeline; a pill
   in the header echoes it.
5. **Whole ladder + current run** — left rail draws every rung persistently with
   the live rung highlighted (the ladder never re-flows; only the highlight moves
   as you scrub).
6. **Smart screen use** — one dense three-column screen under the strip.

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
- No manual mode (log-your-own events) — this prototype is scenario-replay only.
- Auto-layout: node positions are computed by hand (day-index math), not a
  layout engine.
- Throwaway: **not** meant to be built on directly; it's the design evidence for
  the ticket. The real visualizer starts fresh against the assembled spec.
