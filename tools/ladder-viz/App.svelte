<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import DayNode from './DayNode.svelte';
  import Cascade from './Cascade.svelte';
  import { placeholderDay, replayJourney, type JourneyDay } from './journey';
  import { FUTURE_KINDS, spanLabel } from './node-style';
  import { ALLERGEN_ID, RUN_INPUT } from './scenario';

  const nodeTypes = { day: DayNode };

  const journey = replayJourney(RUN_INPUT);

  const COL_GAP = 240;

  // The day-spine: one node per collapsed box, laid left→right.
  const spineNodes: Node[] = journey.map((day, i) => ({
    id: `d${i}`,
    type: 'day',
    position: { x: i * COL_GAP, y: 0 },
    data: { day, span: spanLabel(day.fromDate, day.toDate) },
  }));

  // Edges come from replay, never a frozen adjacency matrix (#519): each is the
  // day-boundary where the box changed, labelled with the channel that changed it.
  const spineEdges: Edge[] = journey.slice(1).map((day, i) => ({
    id: `e${i}`,
    source: `d${i}`,
    target: `d${i + 1}`,
    label: day.enteredVia ?? '',
    animated: day.kind === 'resting',
  }));

  // The future arms greyed off the spine, so the vocabulary is future-complete
  // (#519). Any future arm this run actually reached already renders on the spine,
  // so it is dropped here — a kind is never drawn twice.
  const spineKinds = new Set(journey.map((day) => day.kind));
  const futureNodes: Node[] = FUTURE_KINDS.filter((kind) => !spineKinds.has(kind)).map((kind, i) => ({
    id: `f${i}`,
    type: 'day',
    position: { x: i * COL_GAP, y: 180 },
    data: {
      day: placeholderDay(kind),
      span: 'future',
    },
    selectable: false,
  }));

  const nodes: Node[] = [...spineNodes, ...futureNodes];
  const edges: Edge[] = spineEdges;

  // Cascade drill-in (#531): clicking a day opens its 6-step precedence cascade.
  // The future arms are inert vocabulary (`selectable: false`, `explain: null`),
  // so a click on one opens nothing.
  let selected: JourneyDay | null = $state(null);

  function onnodeclick({ node }: { node: Node }) {
    const day = node.data.day as JourneyDay;
    selected = day.explain ? day : null;
  }

</script>

<div class="app">
  <header>
    <strong>Ladder engine journey</strong>
    <span
      >· {ALLERGEN_ID} · one hard-coded run, replayed through <code>explainLadderMove</code></span
    >
  </header>
  <div class="canvas">
    <SvelteFlow {nodes} {edges} {nodeTypes} {onnodeclick} fitView>
      <Background />
      <Controls />
    </SvelteFlow>
    {#if selected}
      <Cascade day={selected} onclose={() => (selected = null)} />
    {/if}
  </div>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: system-ui, sans-serif;
  }
  header {
    padding: 10px 14px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 14px;
    color: #0f172a;
  }
  header span {
    color: #64748b;
  }
  header code {
    font-size: 12px;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 4px;
  }
  .canvas {
    flex: 1;
    min-height: 0;
    position: relative;
  }
</style>
