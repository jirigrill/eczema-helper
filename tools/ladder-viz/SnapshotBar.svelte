<!-- The `LadderStateSnapshot` (from the real #521 seam), shown once above the
     pipeline — the ladder state as computed for this day, which the structural
     steps in the pipeline cross-reference instead of repeating. All 5 fields
     always present, explicit nulls. Labelled "derived state" rather than the
     seam's own "snapshot" — "snapshot" reads as stale/historical, which this
     isn't (it's recomputed fresh for the selected day); the tooltip still names
     the real type for anyone tracing back to the seam. -->
<script lang="ts">
  import type { LadderStateSnapshot } from '$lib/domain/ladder';

  import { fmtDwell, fmtPendingReaction, fmtRung } from './adapter';

  let { snapshot }: { snapshot: LadderStateSnapshot } = $props();
</script>

<div class="bar">
  <span class="tag">
    derived state
    <span
      class="info"
      title="LadderStateSnapshot — the ladder's state as computed for this day (not raw logged inputs, not history)"
      >?</span
    >
  </span>
  <div class="cell"><span class="k">liveRung</span><span class="v">{fmtRung(snapshot.liveRung)}</span></div>
  <div class="cell"><span class="k">mode</span><span class="v">{snapshot.mode}</span></div>
  <div class="cell">
    <span class="k">pendingReaction</span>
    <span class="v">{fmtPendingReaction(snapshot.pendingReaction)}</span>
  </div>
  <div class="cell"><span class="k">ceilingRung</span><span class="v">{fmtRung(snapshot.ceilingRung)}</span></div>
  <div class="cell"><span class="k">dwell</span><span class="v">{fmtDwell(snapshot.dwell)}</span></div>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 9px 14px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--hair);
  }
  .tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    color: white;
    background: var(--muted);
    padding: 2px 8px;
    border-radius: 999px;
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .info {
    display: inline-grid;
    place-items: center;
    width: 13px;
    height: 13px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.25);
    font-size: 9px;
    font-weight: 700;
    text-transform: none;
    letter-spacing: 0;
    cursor: help;
  }
  .cell { display: flex; flex-direction: column; gap: 1px; }
  .k { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; color: var(--muted); }
  .v { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
