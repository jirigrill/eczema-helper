<!-- The engine as a state machine: the #521 `LadderExplain.steps` 6-tuple
     rendered as a locked, diagonal-cascade Svelte Flow canvas (no pan / no zoom /
     no drag). Each node is one seam step; click to unroll its detail. Steps step
     down-and-right, and the horizontal step size is solved from the container's
     own measured aspect ratio so the cascade's bounding box matches the viewport
     shape — a mismatched box forces fitView to zoom to whichever axis is
     tightest, leaving the other axis's space unused (which is why nodes used to
     render smaller than they have to). The cascade resolves into the verdict
     node. This component maps the seam tuple to nodes — it holds NO engine
     knowledge. -->
<script lang="ts">
  import { onMount } from 'svelte';
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

  const STEP_W = 460; // matches StepNode/VerdictNode's fixed CSS width
  const COLLAPSED = 112;
  const GAP = 30;
  const MIN_X_STEP = 60;
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

  // Measured live so the layout adapts to whatever space the engine column
  // actually has, rather than a guessed constant.
  let wrapper = $state<HTMLDivElement>();
  let containerAspect = $state(1.6);
  onMount(() => {
    if (!wrapper) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) containerAspect = width / height;
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  });

  const totalHeight = $derived.by(() => {
    let y = 0;
    day.explain.steps.forEach((step) => {
      y += heightOf(step, expanded.has(step.name)) + GAP;
    });
    return y + 190; // room for the verdict node
  });

  // Solve the per-step horizontal advance so the cascade's overall bounding
  // box (STEP_W + steps × xStep, by totalHeight) matches the container's
  // aspect ratio — that's what lets fitView zoom in as far as the space allows.
  const xStep = $derived.by(() => {
    const desiredWidth = totalHeight * containerAspect;
    const perStep = (desiredWidth - STEP_W) / day.explain.steps.length;
    return Math.max(MIN_X_STEP, perStep);
  });

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
      x += xStep;
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

  // Re-frame when the day changes or the container is (re)measured — both are
  // genuine size/content changes. An operator expanding a step should just see
  // that node unroll and later nodes shift along the cascade, not the whole
  // canvas zoom, so `expanded` is deliberately not a dependency here.
  let lastDate: string | null = null;
  let lastAspect: number | null = null;
  $effect(() => {
    if (day.date === lastDate && containerAspect === lastAspect) return;
    lastDate = day.date;
    lastAspect = containerAspect;
    const t = setTimeout(() => fitView({ padding: 0.08, duration: 200, maxZoom: 1.8 }), 60);
    return () => clearTimeout(t);
  });
</script>

<div class="wrapper" bind:this={wrapper}>
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    fitView
    fitViewOptions={{ padding: 0.08, maxZoom: 1.8 }}
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
</div>

<style>
  .wrapper {
    width: 100%;
    height: 100%;
  }
</style>
