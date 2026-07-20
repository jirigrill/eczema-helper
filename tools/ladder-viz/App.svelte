<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import DayNode from './DayNode.svelte';
  import Cascade from './Cascade.svelte';
  import { placeholderDay, replayJourney, type JourneyDay, type JourneyRun } from './journey';
  import { FUTURE_KINDS, spanLabel } from './node-style';
  import { parseScenario } from './scenario-loader';

  const nodeTypes = { day: DayNode };

  // Every `scenarios/*.yaml` is loaded as raw text at build time and parsed +
  // Zod-validated on demand (#532). A malformed scenario throws in `parseScenario`,
  // surfaced in the header rather than silently dropped.
  const files = import.meta.glob('./scenarios/*.yaml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const scenarios = Object.entries(files)
    .map(([path, text]) => ({ name: path.replace(/^.*\/(.+)\.yaml$/, '$1'), text }))
    .sort((a, b) => a.name.localeCompare(b.name));

  let selectedScenario = $state(scenarios[0]?.name ?? '');

  let run: JourneyRun | null = $state(null);
  let loadError: string | null = $state(null);

  $effect(() => {
    const chosen = scenarios.find((s) => s.name === selectedScenario);
    // Switching scenarios drops any open cascade — the clicked day belongs to the
    // run we're leaving.
    selected = null;
    if (!chosen) {
      run = null;
      loadError = null;
      return;
    }
    try {
      run = parseScenario(chosen.text);
      loadError = null;
    } catch (err) {
      run = null;
      loadError = err instanceof Error ? err.message : String(err);
    }
  });

  const journey = $derived(run ? replayJourney(run) : []);

  const COL_GAP = 240;

  // The day-spine: one node per collapsed box, laid left→right.
  const spineNodes = $derived<Node[]>(
    journey.map((day, i) => ({
      id: `d${i}`,
      type: 'day',
      position: { x: i * COL_GAP, y: 0 },
      data: { day, span: spanLabel(day.fromDate, day.toDate) },
    })),
  );

  // Edges come from replay, never a frozen adjacency matrix (#519): each is the
  // day-boundary where the box changed, labelled with the channel that changed it.
  const spineEdges = $derived<Edge[]>(
    journey.slice(1).map((day, i) => ({
      id: `e${i}`,
      source: `d${i}`,
      target: `d${i + 1}`,
      label: day.enteredVia ?? '',
      animated: day.kind === 'resting',
    })),
  );

  // The future arms greyed off the spine, so the vocabulary is future-complete
  // (#519). Any future arm this run actually reached already renders on the spine,
  // so it is dropped here — a kind is never drawn twice.
  const spineKinds = $derived(new Set(journey.map((day) => day.kind)));
  const futureNodes = $derived<Node[]>(
    FUTURE_KINDS.filter((kind) => !spineKinds.has(kind)).map((kind, i) => ({
      id: `f${i}`,
      type: 'day',
      position: { x: i * COL_GAP, y: 180 },
      data: {
        day: placeholderDay(kind),
        span: 'future',
      },
      selectable: false,
    })),
  );

  const nodes = $derived<Node[]>([...spineNodes, ...futureNodes]);
  const edges = $derived<Edge[]>(spineEdges);

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
    <label>
      · scenario
      <select bind:value={selectedScenario}>
        {#each scenarios as scenario (scenario.name)}
          <option value={scenario.name}>{scenario.name}</option>
        {/each}
      </select>
    </label>
    {#if run}
      <span>· {run.allergenId} · replayed through <code>explainLadderMove</code></span>
    {/if}
    {#if loadError}
      <span class="error">· load error: {loadError}</span>
    {/if}
  </header>
  <div class="canvas">
    {#key selectedScenario}
      <SvelteFlow {nodes} {edges} {nodeTypes} {onnodeclick} fitView>
        <Background />
        <Controls />
      </SvelteFlow>
    {/key}
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
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  header span {
    color: #64748b;
  }
  header label {
    color: #64748b;
  }
  header select {
    font-size: 13px;
    padding: 2px 4px;
  }
  header code {
    font-size: 12px;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 4px;
  }
  header .error {
    color: #b91c1c;
  }
  .canvas {
    flex: 1;
    min-height: 0;
    position: relative;
  }
</style>
