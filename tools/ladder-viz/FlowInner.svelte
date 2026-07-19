<!-- PROTOTYPE — throwaway (ticket #522). The engine as a state machine: the
     fixed 6-step precedence pipeline as a locked, single-column Svelte Flow
     canvas (no pan / no zoom / no drag). Each step is a node titled with the
     real code identifier; click a node to unroll its inputs. The column
     resolves into the verdict node at the bottom. Re-frames itself (fitView)
     whenever a node expands or the day changes. -->
<script lang="ts">
  import { SvelteFlow, Background, useSvelteFlow, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import StepNode from './StepNode.svelte';
  import VerdictNode from './VerdictNode.svelte';
  import type { DayView } from './engine';

  let { day }: { day: DayView } = $props();

  const nodeTypes = { step: StepNode, verdict: VerdictNode };
  const { fitView } = useSvelteFlow();

  // Which step nodes are unrolled. Persists across day changes.
  let expanded = $state<Set<string>>(new Set());

  const COLLAPSED = 104;
  const GAP = 30;
  function heightOf(inputsLen: number, isExpanded: boolean): number {
    return isExpanded ? COLLAPSED + 26 + inputsLen * 26 : COLLAPSED;
  }

  const nodes = $derived.by<Node[]>(() => {
    const out: Node[] = [];
    let y = 0;
    day.steps.forEach((step, i) => {
      const isExpanded = expanded.has(step.key);
      out.push({
        id: `s${i}`,
        type: 'step',
        position: { x: 0, y },
        data: { step, index: i + 1, tone: day.verdictTone, expanded: isExpanded },
        draggable: false,
        selectable: false,
      });
      y += heightOf(step.inputs.length, isExpanded) + GAP;
    });
    out.push({
      id: 'verdict',
      type: 'verdict',
      position: { x: 0, y: y + 10 },
      data: { label: day.verdictLabel, tone: day.verdictTone, date: day.date, raw: JSON.stringify(day.verdict) },
      draggable: false,
      selectable: false,
    });
    return out;
  });

  const edges = $derived.by<Edge[]>(() => {
    const es: Edge[] = [];
    const toneColor =
      day.verdictTone === 'go' ? 'var(--go)' : day.verdictTone === 'hold' ? 'var(--hold)' : 'var(--stop)';
    for (let i = 0; i < day.steps.length - 1; i++) {
      const reached = day.steps[i]!.status !== 'not-reached' && day.steps[i + 1]!.status !== 'not-reached';
      es.push({
        id: `e${i}`,
        source: `s${i}`,
        target: `s${i + 1}`,
        style: reached ? 'stroke:#9aa3af; stroke-width:1.5;' : 'stroke:#d9dde3; stroke-dasharray:4 4;',
      });
    }
    es.push({
      id: 'e-verdict',
      source: `s${day.steps.length - 1}`,
      target: 'verdict',
      animated: true,
      style: `stroke:${toneColor}; stroke-width:2.5;`,
    });
    return es;
  });

  function onNodeClick({ node }: { node: Node }) {
    const key = (node.data as { step?: { key: string } }).step?.key;
    if (!key) return;
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
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
