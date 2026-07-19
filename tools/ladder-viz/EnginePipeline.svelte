<!-- PROTOTYPE — throwaway (ticket #522). The engine as a state machine:
     the fixed 6-step precedence pipeline on a Svelte Flow canvas, each step a
     node showing its inputs + output, resolving into the verdict node. The
     firing step and its edge to the verdict are highlighted; short-circuited
     steps below it are dimmed. -->
<script lang="ts">
  import { SvelteFlow, Background, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import StepNode from './StepNode.svelte';
  import VerdictNode from './VerdictNode.svelte';
  import type { DayView } from './engine';

  let { day }: { day: DayView } = $props();

  const nodeTypes = { step: StepNode, verdict: VerdictNode };

  const firedIdx = $derived(day.steps.findIndex((s) => s.status === 'fired'));

  const nodes = $derived.by<Node[]>(() => {
    const stepNodes: Node[] = day.steps.map((step, i) => ({
      id: `s${i}`,
      type: 'step',
      position: { x: 0, y: i * 150 },
      data: { step, index: i + 1, tone: day.verdictTone },
      draggable: false,
      selectable: false,
    }));
    stepNodes.push({
      id: 'verdict',
      type: 'verdict',
      position: { x: 350, y: firedIdx * 150 + 20 },
      data: { label: day.verdictLabel, tone: day.verdictTone, date: day.date, raw: JSON.stringify(day.verdict) },
      draggable: false,
      selectable: false,
    });
    return stepNodes;
  });

  const edges = $derived.by<Edge[]>(() => {
    const es: Edge[] = [];
    // precedence flow between consecutive steps that were actually reached
    for (let i = 0; i < day.steps.length - 1; i++) {
      const reached = day.steps[i]!.status !== 'not-reached' && day.steps[i + 1]!.status !== 'not-reached';
      es.push({
        id: `e${i}`,
        source: `s${i}`,
        target: `s${i + 1}`,
        animated: false,
        style: reached ? 'stroke:#9aa; stroke-width:1.5;' : 'stroke:#ddd; stroke-dasharray:4 4;',
      });
    }
    // the firing step resolves to the verdict, colored by tone
    if (firedIdx >= 0) {
      const toneColor = day.verdictTone === 'go' ? 'var(--go)' : day.verdictTone === 'hold' ? 'var(--hold)' : 'var(--stop)';
      es.push({
        id: 'e-verdict',
        source: `s${firedIdx}`,
        target: 'verdict',
        animated: true,
        style: `stroke:${toneColor}; stroke-width:2.5;`,
      });
    }
    return es;
  });
</script>

<div class="canvas">
  <SvelteFlow {nodes} {edges} {nodeTypes} fitView nodesDraggable={false} panOnScroll zoomOnScroll>
    <Background />
  </SvelteFlow>
</div>

<style>
  .canvas {
    height: 100%;
    width: 100%;
  }
</style>
