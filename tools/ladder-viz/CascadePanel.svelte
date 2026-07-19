<!-- PROTOTYPE — throwaway (ticket #522). Content model from #520: fixed
     6-step precedence always fully rendered, derived-state snapshot up
     front, verdict as a raw field dump inline at the step that fired.
     Deliberately shared by both variants — #520 requires this content model
     to be library-independent. -->
<script lang="ts">
  import type { DayNode } from './scenario';

  let { day }: { day: DayNode | null } = $props();
</script>

<aside class="cascade-panel">
  {#if day === null}
    <p class="empty">Click a day node to drill into its cascade.</p>
  {:else}
    <h2>{day.situation}</h2>
    <p class="range">{day.dateRange[0]} – {day.dateRange[1]}</p>

    <h3>Derived state (snapshot)</h3>
    <dl class="snapshot">
      <dt>liveRung</dt><dd>{day.snapshot.liveRung ?? 'null'}</dd>
      <dt>pendingReaction</dt><dd>{day.snapshot.pendingReaction}</dd>
      <dt>ceilingRung</dt><dd>{day.snapshot.ceilingRung}</dd>
      <dt>mode</dt><dd>{day.snapshot.mode}</dd>
      <dt>dwell</dt><dd>{day.snapshot.dwell}</dd>
    </dl>

    <h3>Precedence cascade</h3>
    <ol class="cascade">
      {#each day.cascade as step, i (i)}
        <li class="step status-{step.status}">
          <div class="step-head">
            <span class="step-num">{i + 1}</span>
            <span class="step-label">{step.label}</span>
            <span class="step-status">{step.status}</span>
          </div>
          <div class="step-detail">{step.detail}</div>
          {#if step.status === 'fired'}
            <div class="verdict">
              <strong>verdict:</strong>
              <code>{JSON.stringify(day.verdict)}</code>
            </div>
          {/if}
        </li>
      {/each}
    </ol>

    {#if day.events.length > 0}
      <h3>Events this day</h3>
      <ul class="events">
        {#each day.events as ev, i (i)}
          <li><span class="ev-kind">{ev.kind}</span> {ev.label}</li>
        {/each}
      </ul>
    {/if}
  {/if}
</aside>

<style>
  .cascade-panel {
    width: 360px;
    padding: 1rem;
    border-left: 1px solid #ddd;
    height: 100vh;
    overflow-y: auto;
    font-family: system-ui, sans-serif;
    font-size: 0.85rem;
    box-sizing: border-box;
  }
  .empty { color: #888; }
  h2 { margin: 0 0 0.25rem; font-size: 1.1rem; }
  .range { color: #666; margin: 0 0 1rem; }
  h3 { font-size: 0.8rem; text-transform: uppercase; color: #666; margin: 1rem 0 0.4rem; }
  .snapshot { display: grid; grid-template-columns: auto 1fr; gap: 0.15rem 0.5rem; margin: 0; }
  .snapshot dt { font-weight: 600; }
  .snapshot dd { margin: 0; }
  .cascade { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .step { border: 1px solid #ddd; border-radius: 6px; padding: 0.4rem 0.5rem; }
  .step-head { display: flex; align-items: center; gap: 0.4rem; }
  .step-num { font-weight: 700; color: #999; }
  .step-label { flex: 1; font-weight: 600; }
  .step-status { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 10px; background: #eee; }
  .step-detail { color: #555; margin-top: 0.15rem; }
  .status-fired { border-color: #2563eb; background: #eff6ff; }
  .status-fired .step-status { background: #2563eb; color: white; }
  .status-not-reached { opacity: 0.5; }
  .status-passed-confirmed .step-status { background: #16a34a; color: white; }
  .status-passed-no-data .step-status { background: #ca8a04; color: white; }
  .verdict { margin-top: 0.35rem; padding-top: 0.35rem; border-top: 1px dashed #bbb; }
  .verdict code { display: block; word-break: break-all; }
  .events { margin: 0; padding-left: 1rem; }
  .ev-kind { font-weight: 600; color: #666; }
</style>
