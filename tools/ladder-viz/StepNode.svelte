<!-- PROTOTYPE — throwaway (ticket #522). Custom Svelte Flow node: one
     precedence step rendered as an input→output box (n8n-style), with
     fired / passed-through / not-reached states. -->
<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { StepView } from './engine';

  let { data }: NodeProps = $props();
  const step = $derived(data.step as StepView);
  const tone = $derived((data.tone as 'go' | 'hold' | 'stop') ?? 'go');
</script>

<div class="node status-{step.status} tone-{tone}">
  <Handle type="target" position={Position.Top} />
  <div class="head">
    <span class="idx">{data.index}</span>
    <span class="label">{step.label}</span>
    <span class="badge">{step.status}</span>
  </div>
  <div class="body">
    <div class="io in">
      <div class="io-title">inputs</div>
      {#each step.inputs as inp (inp.label)}
        <div class="row"><span class="k">{inp.label}</span><span class="v">{inp.value}</span></div>
      {/each}
    </div>
    <div class="io out">
      <div class="io-title">output</div>
      <div class="out-val">{step.output}</div>
    </div>
  </div>
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .node {
    width: 300px;
    border: 1px solid var(--hair);
    border-radius: 10px;
    background: var(--surface);
    font-size: 12px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-bottom: 1px solid var(--hair);
    background: var(--surface-2);
  }
  .idx {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--muted);
    width: 14px;
  }
  .label { flex: 1; font-weight: 600; }
  .badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 2px 7px;
    border-radius: 999px;
    background: var(--hair);
    color: var(--muted);
  }
  .body { display: grid; grid-template-columns: 1fr 1fr; }
  .io { padding: 8px 10px; }
  .io.in { border-right: 1px dashed var(--hair); }
  .io-title {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .row { display: flex; justify-content: space-between; gap: 8px; line-height: 1.5; }
  .k { color: var(--muted); }
  .v { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
  .out-val { font-weight: 600; }

  /* fired — this step produced the verdict; colored by the verdict's tone */
  .tone-go { --fired: var(--go); }
  .tone-hold { --fired: var(--hold); }
  .tone-stop { --fired: var(--stop); }
  .status-fired { border-color: var(--fired); box-shadow: 0 0 0 2px color-mix(in srgb, var(--fired) 25%, transparent); }
  .status-fired .head { background: color-mix(in srgb, var(--fired) 12%, var(--surface)); }
  .status-fired .badge { background: var(--fired); color: white; }
  .status-fired .out .out-val { color: var(--fired); }

  /* passed — cascade flowed through */
  .status-passed .out-val { color: var(--muted); }

  /* not-reached — short-circuited before this step */
  .status-not-reached { opacity: 0.42; }
</style>
