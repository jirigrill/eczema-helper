<!-- PROTOTYPE — throwaway (ticket #522). Terminal node: the engine's overall
     output for the day, so the pipeline visibly resolves to one verdict. -->
<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';

  let { data }: NodeProps = $props();
</script>

<div class="verdict tone-{data.tone}">
  <Handle type="target" position={Position.Top} />
  <div class="eyebrow">engine verdict · {data.date}</div>
  <div class="label">{data.label}</div>
  <code class="raw">{data.raw}</code>
</div>

<style>
  .verdict {
    width: 440px;
    border-radius: 12px;
    padding: 12px 14px;
    color: white;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  }
  .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8; }
  .label { font-size: 18px; font-weight: 700; margin: 3px 0 6px; }
  .raw {
    display: block;
    font-size: 11px;
    background: rgba(0, 0, 0, 0.18);
    padding: 5px 7px;
    border-radius: 6px;
    word-break: break-all;
  }
  .tone-go { background: var(--go); }
  .tone-hold { background: var(--hold); }
  .tone-stop { background: var(--stop); }
</style>
