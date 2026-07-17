# ladder-lab UI prototype — NOTES

**Question being answered:** What should the ladder-engine visualizer's main
screen look like — and how does it stay correct as the engine changes?

**Answer (v3, after second round of feedback):** A **compact, single-focus**
visualizer that is a **blind renderer of a trace the engine emits itself**.
Three switchable layouts to compare (Inspector / Split / Trace log). The v2 flow
pipeline was rejected: inputs hard to see, couldn't handle multiple meals/skins
per day, neon colours, ladder too dense, information scattered across the whole
screen — and, critically, the visualizer held **duplicated engine logic** (it
re-inferred which gate fired and hand-wrote every condition string), so engine
changes wouldn't propagate.

## The architecture that makes it self-updating

`decideLadderMove(input, trace?)` now takes an **opt-in trace sink** (additive;
when omitted the engine allocates nothing and behaves byte-for-byte as before —
all 80 engine tests still pass). As the engine walks its precedence it records
one self-describing `TraceGate` per step it evaluated — `{n, id, label,
condition, inputs, passed, outcome}` — and a `LadderStateSnapshot` of the
otherwise-unexported `deriveLadderState` internals (liveRung, mode, ceiling,
pendingReaction, dwell, folded event replay). The gate that short-circuited is
the one whose `passed === false`; steps below it are never recorded (absence =
"not reached").

The prototype's `engine.ts` is now a **dumb adapter**: it builds genuine
Meal / SkinObservation / ReintroductionEvaluation objects, calls the real
`decideLadderMove` with a trace, and hands back the raw trace. **Zero logic** —
no `firedGate()` inference, no hand-authored conditions, no status
reconstruction. Every label/condition/outcome the UI shows is authored by the
engine. Change a gate in `src/lib/domain/ladder.ts` → the visualizer updates for
free, no visualizer edit required. This was the user's hard requirement.

The trace types (`TraceGate`, `LadderStateSnapshot`, `LadderTrace`) live in
`src/lib/domain/ladder.ts` and are the ONE thing from this prototype worth
keeping — they belong in the eventual standalone tool too.

## The three layouts (switch via ?layout= or the floating bottom bar)

- **Inspector** — one focused column: verdict headline → gate cascade directly
  under it; ladder + inputs + engine-state in a compact right sidebar. Nothing to
  scan for.
- **Split** — left rail = the "world" (ladder + this day's inputs); right = the
  "reasoning" (verdict + cascade + state). Two self-contained zones.
- **Trace log** — dense debugger: every day is a log line (date · inputs ·
  verdict); the current day expands inline to show its gates + state indented
  beneath, like stepping debugger frames.

Shared pieces: `Transport` (play/scrub/timeline), `GateRow` (renders one
`TraceGate` blind), `LadderStrip` (compact, driven by trace state), `InputsCard`
(groups multiple meals/skins/evals per day), `StatePanel` (the engine internals
+ replay), `tokens.ts` (calm slate/stone palette — no neon).

## Wired to the real engine — verified

`engine.ts` calls the actual `decideLadderMove` + gates per event date. Verified
end-to-end: dairy climb `pinch→teaspoon→teaspoon→spoon`, then a `clear-reaction`
fires gate #3 (reaction) and walks the live rung down to `teaspoon`, rest window
open. The 06-14 day carries **two** skin observations (severity 2 then 3) and
fires gate #4 (skin) on the real trend — proving multi-input days work.

## Status: THROWAWAY (the prototype folder + guards)

Delete `src/routes/ladder-lab-prototype/` once the design is rebuilt in the
standalone `tools/ladder-lab/` Vite app. Revert the prototype-only guard in
`src/routes/+layout.svelte` and the worktree `vite.config.ts` edits
(`server.fs.allow` + dev PWA disabled) — none of these merge to main.

**KEEP, do not throw away:** the `trace` instrumentation in
`src/lib/domain/ladder.ts` is production-quality and additive. Promoting it is
the natural way to give the real app (and the standalone tool) an honest,
self-updating view of the engine. Decide separately whether to merge it.

**How to view:** `just dev` (or `bun run dev`), then
`http://localhost:5199/ladder-lab-prototype` (append `?layout=split` etc.)

## Scenario in the fixture (engine.ts DEFAULT_SCENARIO)

dairy · tolerance-building · **mixed** stage. Climb pinch→teaspoon→teaspoon→
spoon; two skin obs on 06-14 (worsening); `clear-reaction` on 06-15 → walk-down
to teaspoon + rest window; re-confirm dose on 06-22.

Note: each verdict is evaluated on the same day its meal is logged, so climbing
steps read `hold — cadence` even as the live rung advances (truthful engine
behaviour). Gate #6 (advance) therefore never fires in this fixture. To *see*
`advance`/`settled`, evaluate a day after each dose.

## VERDICT (fill in after review)

Winner: pending — three layouts up for comparison.
Bits still to decide: (a) which layout; (b) whether to shift the fixture to show
`advance`/`settled`; (c) scenario editing (YAML/manual); (d) whether to promote
the engine `trace` instrumentation to production.
