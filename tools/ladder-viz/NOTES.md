# Prototype notes — ticket #522

**Question:** pick the viz library for the standalone ladder-engine
visualizer (map: [standalone ladder-engine visualizer](https://github.com/jirigrill/eczema-helper/issues/518)) —
Svelte Flow vs Mermaid — by building the click-a-step → drill-into-cascade
interaction against one hard-coded scenario and judging the feel, not the
paper comparison.

## Verdict: Svelte Flow (`@xyflow/svelte`)

Both libraries render the day-spine journey (`#519`'s model) and both can
drive the cascade drill-in (`#520`'s content spec, in `CascadePanel.svelte`,
deliberately shared by both variants to prove the content model is
library-independent). The difference is in the interaction:

- **Svelte Flow** has a first-class node click API (`onnodeclick`), free
  pan/zoom, and nodes are real interactive elements — clicking a day and
  seeing the cascade populate feels like *flow through the engine*, per the
  ticket's own test. Node styling (colour by situation) and the
  `settled → resting` back-edge are trivial to express as data.
- **Mermaid** (`stateDiagram-v2`) is cheap to generate (a text template) but
  **state diagrams don't support the `click` directive** — only flowcharts
  do. Wiring the click required bypassing Mermaid's declarative API entirely
  and querying the rendered SVG for auto-generated group ids
  (`mermaid-graph-state-<label>-<n>`), matched by substring since the exact
  id isn't part of Mermaid's public contract. That's a foundation the real
  build would keep fighting, not one interaction hack. Mermaid also has no
  built-in pan/zoom — a 14-day scenario already needs scrolling.

Confirms the map's prior favourite (map Notes, Q6).

## Toolchain wiring (graduates map's "Not yet specified: toolchain wiring")

- **Separate Vite root**, not a SvelteKit route: `tools/ladder-viz/vite.config.ts`,
  its own `tools/ladder-viz/tsconfig.json` (does **not** extend
  `.svelte-kit/tsconfig.json` — that file doesn't exist until `svelte-kit
  sync` runs, and this tool is intentionally outside the SvelteKit app).
  Root `tsconfig.json` excludes `tools/` so `svelte-check`/`just check`
  never touches it.
- **`just viz`** recipe: `bunx vite dev --config tools/ladder-viz/vite.config.ts`
  — same shape as `just simulate`, "not shipped, same category as
  `scripts/simulate.ts`" (map Notes).
- **`$lib` import boundary**: the tool's `vite.config.ts` aliases `$lib` to
  `../../src/lib`, mirroring `svelte.config.js`'s alias, so the visualizer
  can import domain types (`LadderDecision`, etc.) directly — read-only,
  nothing in `src/lib` depends back on `tools/`.
  See `scenario.ts`'s `import type { LadderDecision } from '$lib/domain/ladder'`.
  This is the concrete answer for the real build (ticket F) to follow.
- **Svelte + Vite, no Tailwind**: styling here is plain scoped `<style>`
  blocks — the visualizer's few UI needs (a graph, a side panel, a variant
  bar) don't warrant pulling in Tailwind's build step for a tool this small.
  The real build can revisit if the eventual UI grows.

## What this prototype does NOT settle

- The actual explain/trace seam (#521, unresolved) — the cascade data here
  is hand-authored to the shape that seam will eventually emit, not read
  from `decideLadderMove`.
- Auto-layout for the journey graph — day positions here are hard-coded
  per the one canned scenario; the real build needs a real layout strategy
  (Svelte Flow doesn't auto-layout out of the box; `dagre`/`elk` or a
  simple day-index-as-x approach are the candidates, deferred to the build).
- This code is throwaway (per map Notes: "Only the prototype ticket (D)
  produces a throwaway artifact") — it is **not** meant to be built upon
  directly by the eventual visualizer build ticket. It lives on this
  branch/PR as the answer's evidence, not on `main`.

Run: `just viz`, then open `http://localhost:5180/?variant=svelte-flow` or
`?variant=mermaid` to flip between the two side by side.
