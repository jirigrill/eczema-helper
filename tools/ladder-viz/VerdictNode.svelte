<!-- Terminal node: the engine's actual output — `LadderExplain.decision`, the
     raw LadderDecision — pretty-printed. The seam synthesizes no prose (#521);
     this dumps whatever fields the variant that fired carries. -->
<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';

  let { data }: NodeProps = $props();
</script>

<div class="verdict tone-{data.tone}">
  <Handle type="target" position={Position.Top} />
  <div class="eyebrow">engine verdict · LadderDecision · {data.date}</div>
  <div class="label">{data.label}</div>
  <pre class="raw">{data.json}</pre>
</div>

<style>
  .verdict {
    width: 460px;
    border-radius: 12px;
    padding: 14px 16px;
    color: white;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  }
  .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85; }
  .label { font-size: 20px; font-weight: 800; margin: 4px 0 10px; }
  .raw {
    display: block;
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    line-height: 1.55;
    background: rgba(0, 0, 0, 0.22);
    padding: 12px 14px;
    border-radius: 8px;
    white-space: pre;
    overflow-x: auto;
  }
  .tone-go { background: var(--go); }
  .tone-hold { background: var(--hold); }
  .tone-stop { background: var(--stop); }
</style>
