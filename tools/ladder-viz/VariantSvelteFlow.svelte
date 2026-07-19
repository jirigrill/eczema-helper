<!-- PROTOTYPE — throwaway (ticket #522). Variant A: @xyflow/svelte. -->
<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { SCENARIO, BACK_EDGES } from './scenario';
  import CascadePanel from './CascadePanel.svelte';

  let selectedIndex = $state<number | null>(null);
  const selectedDay = $derived(selectedIndex === null ? null : SCENARIO[selectedIndex]!);

  const nodes = $state<Node[]>(
    SCENARIO.map((day, i) => ({
      id: String(i),
      type: 'default',
      position: { x: i * 220, y: day.situation === 'resting' || day.situation === 'stepped-back' ? 160 : 0 },
      data: {
        label: `${day.situation}\n${day.dateRange[0]}${day.dateRange[0] !== day.dateRange[1] ? ' → ' + day.dateRange[1] : ''}${day.events.length ? `\n(${day.events.length} event${day.events.length > 1 ? 's' : ''})` : ''}`,
      },
      style: nodeStyle(day.situation),
    })),
  );

  function nodeStyle(situation: string): string {
    const colors: Record<string, string> = {
      climbing: '#16a34a',
      'holding-cadence': '#ca8a04',
      'holding-skin': '#ca8a04',
      resting: '#dc2626',
      'stepped-back': '#dc2626',
      dwelling: '#2563eb',
      settled: '#15803d',
      'not-started': '#999',
    };
    const c = colors[situation] ?? '#666';
    return `border: 2px solid ${c}; white-space: pre-line; font-size: 11px; text-align: center; border-radius: 8px; padding: 6px;`;
  }

  const edges = $state<Edge[]>([
    ...SCENARIO.slice(0, -1).map((_, i) => ({
      id: `e${i}`,
      source: String(i),
      target: String(i + 1),
      animated: false,
    })),
    ...BACK_EDGES.map(([from, to], i) => ({
      id: `back${i}`,
      source: String(from),
      target: String(to),
      label: 'reaction (settled → resting)',
      style: 'stroke: #dc2626; stroke-dasharray: 5 3;',
      type: 'step',
    })),
  ]);

  function onNodeClick({ node }: { node: Node }) {
    selectedIndex = Number(node.id);
  }
</script>

<div class="layout">
  <div class="flow-wrap">
    <SvelteFlow {nodes} {edges} fitView onnodeclick={onNodeClick}>
      <Background />
      <Controls />
    </SvelteFlow>
  </div>
  <CascadePanel day={selectedDay} />
</div>

<style>
  .layout { display: flex; height: 100vh; }
  .flow-wrap { flex: 1; }
</style>
