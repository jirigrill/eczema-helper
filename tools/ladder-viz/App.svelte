<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import DayNode from './DayNode.svelte';
  import { replayJourney, type JourneyNodeKind } from './journey';
  import { spanLabel } from './node-style';
  import {
    ALLERGEN_ID,
    CADENCE_DAYS,
    DAYS,
    LADDER,
    RUN,
    STABILITY_WINDOW_DAYS,
    STAGE,
  } from './scenario';

  const nodeTypes = { day: DayNode };

  const journey = replayJourney({
    allergenId: ALLERGEN_ID,
    defaultLadder: LADDER,
    stage: STAGE,
    cadenceDays: CADENCE_DAYS,
    stabilityWindowDays: STABILITY_WINDOW_DAYS,
    events: RUN,
    days: DAYS,
  });

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

  // The 3 future arms the engine never emits yet — greyed, off the spine, so the
  // vocabulary is future-complete (#519). They light up the day the engine emits them.
  const FUTURE: JourneyNodeKind[] = ['adapting-decelerate', 'suspected-reaction', 'ceiling-severe'];
  const futureNodes: Node[] = FUTURE.map((kind, i) => ({
    id: `f${i}`,
    type: 'day',
    position: { x: i * COL_GAP, y: 180 },
    data: {
      day: { kind, fromDate: '', toDate: '', events: [], explain: null, enteredVia: null },
      span: 'future',
    },
    selectable: false,
  }));

  const nodes: Node[] = [...spineNodes, ...futureNodes];
  const edges: Edge[] = spineEdges;
</script>

<div class="app">
  <header>
    <strong>Ladder engine journey</strong>
    <span
      >· {ALLERGEN_ID} · one hard-coded run, replayed through <code>explainLadderMove</code></span
    >
  </header>
  <div class="canvas">
    <SvelteFlow {nodes} {edges} {nodeTypes} fitView>
      <Background />
      <Controls />
    </SvelteFlow>
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
  }
</style>
