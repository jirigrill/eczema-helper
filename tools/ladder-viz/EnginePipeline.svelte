<!-- Provider wrapper so the inner flow can drive fitView (needs the SvelteFlow
     context). See FlowInner.svelte. -->
<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import FlowInner from './FlowInner.svelte';
  import type { DayView } from './adapter';

  let { day }: { day: DayView } = $props();
</script>

<div class="canvas">
  <SvelteFlowProvider>
    <FlowInner {day} />
  </SvelteFlowProvider>
</div>

<style>
  .canvas { height: 100%; width: 100%; }
</style>
