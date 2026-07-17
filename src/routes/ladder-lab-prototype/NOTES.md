# ladder-lab UI prototype — NOTES

**Question being answered:** What should the ladder-engine visualizer's main
screen look like?

**Answer (v4 — full reset, DAG-oriented):** Three *completely different*,
innovative **directed-graph** takes on the engine, driven by **pure dummy data**
(no engine wiring — look-and-feel only, on purpose). The v2 flow-pipeline and v3
compact-layouts rounds were both rejected. This round abandons dashboards
entirely and leans into the engine's real shape: a **DAG** — one input source →
an ordered gate cascade → verdict sinks, where each gate either *fires* (short-
circuit to a verdict) or *passes* (fall through to the next gate).

## The three layouts (switch via floating bar or ?layout=)

1. **Circuit DAG** (`LayoutCircuit`) — the literal node-and-edge graph in SVG:
   a source circle, a vertical spine of gate nodes, verdict pills on the right,
   wired with bezier edges. For the current day the decision *path* illuminates
   (source → passed gates → fired gate → verdict); the rest dims to a faint
   substrate. The engine as an actual circuit you watch current flow through.

2. **Flow / Sankey** (`LayoutSankey`) — the *whole scenario at once*: every day
   is a numbered particle that enters at the source and drops out at the gate
   that catches it, into that gate's verdict. Ribbon thickness = how many days
   each gate caught, so you see the engine's behaviour *distribution* in one
   glance. The current day's particle glows.

3. **Subway map** (`LayoutSubway`) — the cascade as a transit line: gates are
   stations on one track, each with a spur down to its verdict terminal. The
   current day is a train 🚆 that rides the track and pulls off at the station
   where its gate fired. Playful, spatial; still a DAG (linear spine + spurs).

Shared: `Explorer.svelte` (shell: transport play/scrub + input chips + switcher),
`fixture.ts` (the static DAG `NODES`/`EDGES` + a 6-day dummy scenario + calm
slate/stone palette).

## Dummy data (fixture.ts)

Hand-authored fiction — NOT the engine. A dairy-ish story: cadence-hold →
advance → advance → skin-hold (two skin obs that day) → reaction/rest →
advance. Every fired gate + verdict resolves to a real graph node (validated).
Unlike earlier fixtures this one *does* show `advance` verdicts.

## Status: THROWAWAY

Delete `src/routes/ladder-lab-prototype/` once a direction is chosen and rebuilt
in the standalone `tools/ladder-lab/` app. Revert the prototype-only guard in
`src/routes/+layout.svelte` and the worktree `vite.config.ts` edits — none merge
to main.

Note: the `trace` instrumentation added to `src/lib/domain/ladder.ts` in the
previous round is still on this branch (additive, tests pass). It is unused by
this dummy-data prototype; keep or revert it independently of the design choice.

**How to view:** `just dev`, then `http://localhost:5199/ladder-lab-prototype`
(append `?layout=sankey` / `?layout=subway`).

## VERDICT (fill in after review)

Winner: pending — pick one of Circuit / Sankey / Subway (or a hybrid).
Then decide: wire it to the real engine trace, and whether to add scenario
editing.
