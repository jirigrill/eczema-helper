<!-- The `LadderStateSnapshot` (from the real #521 seam), shown once above the
     pipeline — the derived state the structural steps cross-reference. All 5
     fields always present, explicit nulls. -->
<script lang="ts">
  import type { LadderStateSnapshot } from '$lib/domain/ladder';

  let { snapshot }: { snapshot: LadderStateSnapshot } = $props();

  const dose = (r: { dose: string } | null) => (r ? r.dose : 'null');
</script>

<div class="bar">
  <span class="tag">
    snapshot
    <span class="info" title="LadderStateSnapshot — derived engine state the steps below cross-reference, not the raw logged inputs">?</span>
  </span>
  <div class="cell"><span class="k">liveRung</span><span class="v">{dose(snapshot.liveRung)}</span></div>
  <div class="cell"><span class="k">mode</span><span class="v">{snapshot.mode}</span></div>
  <div class="cell">
    <span class="k">pendingReaction</span>
    <span class="v">{snapshot.pendingReaction ? `${snapshot.pendingReaction.rung.dose} · until ${snapshot.pendingReaction.until || '—'}` : 'null'}</span>
  </div>
  <div class="cell"><span class="k">ceilingRung</span><span class="v">{dose(snapshot.ceilingRung)}</span></div>
  <div class="cell"><span class="k">dwell</span><span class="v">{snapshot.dwell.count}× · {snapshot.dwell.lastDoseDate ?? '—'}</span></div>
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
