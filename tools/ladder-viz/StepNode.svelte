<!-- PROTOTYPE — throwaway (ticket #522). Custom Svelte Flow node: one
     precedence step, titled with the real code identifier it evaluates.
     Collapsed shows the output; click to unroll the full inputs → output. -->
<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { StepView } from './engine';

  let { data }: NodeProps = $props();
  const step = $derived(data.step as StepView);
  const index = $derived(data.index as number);
  const tone = $derived((data.tone as 'go' | 'hold' | 'stop') ?? 'go');
  const expanded = $derived(data.expanded as boolean);
</script>

<div class="node status-{step.status} tone-{tone}" class:expanded>
  <Handle type="target" position={Position.Top} />

  <div class="head">
    <span class="idx">{index}</span>
    <div class="titles">
      <code class="fn">{step.fn}</code>
      <div class="note">{step.note}</div>
    </div>
    <span class="badge">{step.status}</span>
    <span class="chev">{expanded ? '▾' : '▸'}</span>
  </div>

  {#if expanded}
    <div class="io">
      <div class="io-title">inputs</div>
      {#each step.inputs as inp (inp.label)}
        <div class="row"><code class="k">{inp.label}</code><span class="v">{inp.value}</span></div>
      {/each}
    </div>
  {/if}

  <div class="output">
    <span class="out-tag">output</span>
    <span class="out-val">{step.output}</span>
  </div>

  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .node {
    width: 440px;
    border: 1.5px solid var(--hair);
    border-radius: 12px;
    background: var(--surface);
    font-size: 13px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    cursor: pointer;
  }
  .head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    background: var(--surface-2);
  }
  .idx {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--muted);
    background: var(--surface);
    border: 1px solid var(--hair);
    border-radius: 6px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    flex: none;
    font-size: 12px;
  }
  .titles { flex: 1; min-width: 0; }
  .fn {
    display: block;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.35;
    word-break: break-word;
  }
  .note { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--hair);
    color: var(--muted);
    flex: none;
    font-weight: 600;
  }
  .chev { color: var(--muted); font-size: 11px; flex: none; margin-top: 2px; }

  .io { padding: 10px 14px; border-top: 1px solid var(--hair); }
  .io-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .row { display: flex; justify-content: space-between; gap: 12px; line-height: 1.9; align-items: baseline; }
  .k { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); }
  .v { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }

  .output {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 10px 14px;
    border-top: 1px solid var(--hair);
    background: var(--surface);
  }
  .out-tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    flex: none;
  }
  .out-val { font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }

  /* fired — this step produced the verdict; colored by the verdict's tone */
  .tone-go { --fired: var(--go); }
  .tone-hold { --fired: var(--hold); }
  .tone-stop { --fired: var(--stop); }
  .status-fired { border-color: var(--fired); box-shadow: 0 0 0 3px color-mix(in srgb, var(--fired) 20%, transparent); }
  .status-fired .head { background: color-mix(in srgb, var(--fired) 12%, var(--surface)); }
  .status-fired .badge { background: var(--fired); color: white; }
  .status-fired .output .out-val { color: var(--fired); }

  /* passed — cascade flowed through */
  .status-passed .out-val { color: var(--muted); }

  /* not-reached — short-circuited before this step */
  .status-not-reached { opacity: 0.4; }
</style>
