<!-- The engine as a state machine: the #521 `LadderExplain.steps` 6-tuple
     rendered as a locked, diagonal-cascade Svelte Flow canvas (no pan / no zoom /
     no drag). Each node is one seam step; click to unroll its detail. Steps step
     down-and-right so fitView has both canvas dimensions to spread across —
     a pure vertical column forces a tighter zoom-to-fit than the viewport's
     aspect ratio needs, which is why nodes used to render smaller than they
     have to. The cascade resolves into the verdict node. This component maps
     the seam tuple to nodes — it holds NO engine knowledge. -->
<script lang="ts">
  import { SvelteFlow, Background, useSvelteFlow, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import type { LadderPrecedenceStep } from '$lib/domain/ladder';
  import StepNode from './StepNode.svelte';
  import VerdictNode from './VerdictNode.svelte';
  import type { DayView } from './adapter';

  let { day }: { day: DayView } = $props();

  const nodeTypes = { step: StepNode, verdict: VerdictNode };
  const { fitView } = useSvelteFlow();

  // Which step nodes are unrolled (keyed by the seam step name). Persists.
  let expanded = $state<Set<string>>(new Set());

  const COLLAPSED = 112;
  const GAP = 30;
  const X_STEP = 190; // horizontal advance per step, so the cascade uses width, not just height
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
    let x = 0;
    let y = 0;
    day.explain.steps.forEach((step, i) => {
      const isExpanded = expanded.has(step.name);
      out.push({
        id: step.name,
        type: 'step',
        position: { x, y },
        data: { step, index: i + 1, tone: day.verdictTone, expanded: isExpanded },
        draggable: false,
        selectable: false,
      });
      y += heightOf(step, isExpanded) + GAP;
      x += X_STEP;
    });
    out.push({
      id: 'verdict',
      type: 'verdict',
      position: { x, y: y + 10 },
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

  // Re-frame only when the day itself changes — an operator expanding a step
  // should see that node unroll and later nodes shift down, not the whole
  // canvas zoom. `fitView`'s own `fitView` prop covers the very first mount.
  let lastDate: string | null = null;
  $effect(() => {
    if (day.date === lastDate) return;
    lastDate = day.date;
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
