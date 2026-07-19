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
   drag; it re-frames itself on expand). Each node is one element of the #521
   `LadderExplain.steps` tuple, titled with its canonical seam name + the real
   code identifier it evaluates, showing its status and — on click — its detail.
   The firing node is tone-highlighted; short-circuited nodes are dimmed. The
   `LadderStateSnapshot` shows once, in a bar above the pipeline.
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

## Read-only by construction (the point)

**The visualizer copies no engine logic and is independent of the engine.** The
files are split so this is structural, not a promise:

- `scenario.ts` — pure data: the ladder, the event builders, the canned history,
  the calendar. Constructs domain records; contains no decision logic.
- `seam.ts` — a **verbatim mirror of the #521 `explainLadderMove` contract**
  (`LadderExplain = { decision, snapshot, steps }`). The read-only surface the UI
  renders.
- `adapter.ts` — **the ONLY file that touches the engine.** It `import`s
  `$lib/domain` and reconstructs a `LadderExplain` for one day. Every Svelte
  component imports only `seam.ts` types + `scenario.ts` data — never
  `$lib/domain` decision logic. So a gate added or changed in the engine can, at
  most, touch this one file.

### Why reconstruct at all — and how little

#521 (the explain/trace seam) is **designed but not yet implemented** (its ticket
is closed; the code is the "F hand-off build"). Until `explainLadderMove` exists,
`adapter.ts` reconstructs its output. It does so **read-only**: it calls the real
`decideLadderMove` + the real public gates (`cadenceGate`, `skinStabilityGate`,
`currentRung`, `nextLegalStep`, `effectiveCadenceDays`) and renders what they
return. Gate-backed steps carry the gate's *actual result object*, rendered
generically (`Object.entries`) — a new gate field shows up with **zero** UI
change, and each such node is tagged **`live read`** in the UI.

The only genuinely reconstructed bits are the four the engine keeps private
today — the precedence order (which step fired), `mode`, `pendingReaction`,
`dwell` — each labelled **`reconstructed · #521`** in the UI so the coupling is
auditable at a glance. Gate *outputs* are read; only these private *internals*
are inferred.

### When #521's F build ships

`adapter.ts`'s reconstruction collapses to:

```ts
import { explainLadderMove } from '$lib/domain/ladder';
export const buildExplain = explainLadderMove;
```

`seam.ts` is deleted (its types come from `$lib` instead). **No Svelte component
changes** — they already render `LadderExplain`. That is the independence goal,
proven end-to-end by this prototype.

`other:<allergenId>` food ids let meals register as doses without wiring the food
catalog (the engine's `foodTriggers` slices the prefix). The canned scenario walks
a real spread of the union: advance → cadence-hold → skin-worsening → rest →
step-back → tolerated-clear → re-climb → passed (top) → late reaction re-opens.

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
