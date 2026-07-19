<!-- PROTOTYPE — throwaway (ticket #522). The engine as a state machine: the
     #521 `LadderExplain.steps` 6-tuple rendered as a locked, single-column
     Svelte Flow canvas (no pan / no zoom / no drag). Each node is one seam
     step; click to unroll its detail. The column resolves into the verdict
     node. Re-frames itself (fitView) on expand / day change. This component
     maps the seam tuple to nodes — it holds NO engine knowledge. -->
<script lang="ts">
  import { SvelteFlow, Background, useSvelteFlow, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import StepNode from './StepNode.svelte';
  import VerdictNode from './VerdictNode.svelte';
  import type { DayView } from './adapter';
  import type { LadderPrecedenceStep } from './seam';

  let { day }: { day: DayView } = $props();

  const nodeTypes = { step: StepNode, verdict: VerdictNode };
  const { fitView } = useSvelteFlow();

  // Which step nodes are unrolled (keyed by the seam step name). Persists.
  let expanded = $state<Set<string>>(new Set());

  const COLLAPSED = 112;
  const GAP = 30;
  function rowCount(step: LadderPrecedenceStep): number {
    if ('gate' in step.detail) {
      let n = Object.keys(step.detail.gate).length;
      if ('windowDays' in step.detail) n++;
      if ('cadenceDays' in step.detail) n++;
      return n;
    }
    return 1;
  }
  function heightOf(step: LadderPrecedenceStep, isExpanded: boolean): number {
    return isExpanded ? COLLAPSED + 34 + rowCount(step) * 26 : COLLAPSED;
  }

  const nodes = $derived.by<Node[]>(() => {
    const out: Node[] = [];
    let y = 0;
    day.explain.steps.forEach((step, i) => {
      const isExpanded = expanded.has(step.name);
      out.push({
        id: step.name,
        type: 'step',
        position: { x: 0, y },
        data: { step, index: i + 1, tone: day.verdictTone, expanded: isExpanded },
        draggable: false,
        selectable: false,
      });
      y += heightOf(step, isExpanded) + GAP;
    });
    out.push({
      id: 'verdict',
      type: 'verdict',
      position: { x: 0, y: y + 10 },
      data: { label: day.verdictLabel, tone: day.verdictTone, date: day.date, json: day.verdictJson },
      draggable: false,
      selectable: false,
    });
    return out;
  });

  const edges = $derived.by<Edge[]>(() => {
    const es: Edge[] = [];
    const steps = day.explain.steps;
    const toneColor =
      day.verdictTone === 'go' ? 'var(--go)' : day.verdictTone === 'hold' ? 'var(--hold)' : 'var(--stop)';
    for (let i = 0; i < steps.length - 1; i++) {
      const reached = steps[i]!.status !== 'not-reached' && steps[i + 1]!.status !== 'not-reached';
      es.push({
        id: `e${i}`,
        source: steps[i]!.name,
        target: steps[i + 1]!.name,
        style: reached ? 'stroke:#9aa3af; stroke-width:1.5;' : 'stroke:#d9dde3; stroke-dasharray:4 4;',
      });
    }
    es.push({
      id: 'e-verdict',
      source: steps[steps.length - 1]!.name,
      target: 'verdict',
      animated: true,
      style: `stroke:${toneColor}; stroke-width:2.5;`,
    });
    return es;
  });

  function onNodeClick({ node }: { node: Node }) {
    const name = (node.data as { step?: { name: string } }).step?.name;
    if (!name) return;
    const next = new Set(expanded);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    expanded = next;
  }

  // Keep the whole column framed as it grows/shrinks or the day changes.
  $effect(() => {
    void nodes;
    const t = setTimeout(() => fitView({ padding: 0.12, duration: 200, maxZoom: 1 }), 60);
    return () => clearTimeout(t);
  });
</script>

<SvelteFlow
  {nodes}
  {edges}
  {nodeTypes}
  fitView
  fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
  nodesDraggable={false}
  nodesConnectable={false}
  elementsSelectable={false}
  panOnDrag={false}
  panOnScroll={false}
  zoomOnScroll={false}
  zoomOnPinch={false}
  zoomOnDoubleClick={false}
  preventScrolling={false}
  onnodeclick={onNodeClick}
>
  <Background bgColor="var(--canvas)" patternColor="#dfe3e9" />
</SvelteFlow>
