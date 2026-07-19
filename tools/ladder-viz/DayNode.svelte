<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { eventLine, type JourneyDay } from './journey';
  import { nodeStyle } from './node-style';

  let { data }: NodeProps = $props();
  const day = $derived(data.day as JourneyDay);
  const span = $derived(data.span as string);
  const style = $derived(nodeStyle(day.kind));
</script>

<div class="day-node" class:future={style.future} data-terminal={style.terminal}>
  <Handle type="target" position={Position.Left} />
  <div class="head">
    <span class="kind">{style.label}</span>
    <span class="span">{span}</span>
  </div>
  {#if day.events.length > 0}
    <ul class="events">
      {#each day.events as event (event.date + event.channel)}
        <li>{eventLine(event)}</li>
      {/each}
    </ul>
  {:else if day.kind !== 'not-started'}
    <div class="quiet">— no event —</div>
  {/if}
  <Handle type="source" position={Position.Right} />
</div>

<style>
  .day-node {
    min-width: 160px;
    border: 2px solid #94a3b8;
    border-radius: 10px;
    background: #ffffff;
    padding: 8px 10px;
    font:
      13px/1.35 system-ui,
      sans-serif;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
  }
  .day-node[data-terminal='entry'] {
    border-style: dashed;
    background: #f1f5f9;
    color: #64748b;
  }
  .day-node[data-terminal='settled'] {
    border-color: #16a34a;
    background: #f0fdf4;
  }
  .day-node[data-terminal='absorbing'] {
    border-color: #dc2626;
    background: #fef2f2;
  }
  .day-node.future {
    opacity: 0.4;
    border-style: dotted;
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: baseline;
  }
  .kind {
    font-weight: 600;
  }
  .span {
    font-size: 11px;
    color: #64748b;
    white-space: nowrap;
  }
  .events {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .events li {
    font-size: 12px;
    color: #334155;
  }
  .quiet {
    margin-top: 4px;
    font-size: 11px;
    color: #94a3b8;
    font-style: italic;
  }
</style>
