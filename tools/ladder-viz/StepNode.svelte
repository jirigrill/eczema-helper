<!-- Custom Svelte Flow node: ONE element of the #521 `LadderExplain.steps`
     6-tuple, rendered generically. It knows nothing about the engine's logic —
     it reflects over whatever `detail`/`status` the seam hands it. Gate-backed
     steps show their gate result's fields as-is (a new field appears with no
     change here); structural steps cross-reference the snapshot. Click to unroll. -->
<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { LadderPrecedenceStep, LadderPrecedenceStepName } from '$lib/domain/ladder';

  let { data }: NodeProps = $props();
  const step = $derived(data.step as LadderPrecedenceStep);
  const index = $derived(data.index as number);
  const tone = $derived((data.tone as 'go' | 'hold' | 'stop') ?? 'go');
  const expanded = $derived(data.expanded as boolean);

  // Stable UI captions for the 6 fixed step names (part of the #521 contract).
  const FN: Record<LadderPrecedenceStepName, string> = {
    'permanent-or-empty': 'resolveLadder().stages[stage] · isPermanentlyEliminated',
    ceiling: 'deriveLadderState().ceilingRung',
    reaction: 'deriveLadderState().pendingReaction',
    'skin-worsening': 'skinStabilityGate()',
    cadence: 'effectiveCadenceDays() · cadenceGate()',
    'advance-or-dwell': 'nextLegalStep() · dwell',
  };
  const SNAP_REF: Record<LadderPrecedenceStepName, string> = {
    'permanent-or-empty': 'snapshot: liveRung / rung count',
    ceiling: 'snapshot.ceilingRung',
    reaction: 'snapshot.pendingReaction',
    'skin-worsening': '',
    cadence: '',
    'advance-or-dwell': 'snapshot.liveRung · dwell',
  };

  const gateBacked = $derived('gate' in step.detail);

  function fmt(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'object') return 'dose' in (v as Record<string, unknown>) ? String((v as { dose: string }).dose) : JSON.stringify(v);
    return String(v);
  }
  // Reflect over the gate result object + its paired threshold — generic.
  const gateRows = $derived.by<{ k: string; v: string }[]>(() => {
    if (!('gate' in step.detail)) return [];
    const d = step.detail;
    const rows = Object.entries(d.gate).map(([k, v]) => ({ k, v: fmt(v) }));
    if ('windowDays' in d) rows.push({ k: 'windowDays', v: String(d.windowDays) });
    if ('cadenceDays' in d) rows.push({ k: 'cadenceDays (effective)', v: String(d.cadenceDays) });
    return rows;
  });
</script>

<div class="node status-{step.status} tone-{tone}" class:expanded>
  <Handle type="target" position={Position.Top} />

  <div class="head">
    <span class="idx">{index}</span>
    <div class="titles">
      <div class="name-row">
        <code class="name">{step.name}</code>
      </div>
      <code class="fn">{FN[step.name]}</code>
    </div>
    <span class="badge">{step.status}</span>
    <span class="chev">{expanded ? '▾' : '▸'}</span>
  </div>

  {#if expanded}
    <div class="io">
      {#if gateBacked}
        <div class="io-title">gate result — read from the engine</div>
        {#each gateRows as r (r.k)}
          <div class="row"><code class="k">{r.k}</code><span class="v">{r.v}</span></div>
        {/each}
      {:else}
        <div class="io-title">no payload — evidence in the snapshot</div>
        <div class="ref">{SNAP_REF[step.name]}</div>
      {/if}
    </div>
  {/if}

  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .node {
    width: 460px;
    border: 1.5px solid var(--hair);
    border-radius: 12px;
    background: var(--surface);
    font-size: 13px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    cursor: pointer;
  }
  .head { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: var(--surface-2); }
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
  .name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; font-weight: 700; color: var(--ink); }
  .fn { display: block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--muted); margin-top: 3px; word-break: break-word; }
  .badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--hair);
    color: var(--muted);
    flex: none;
    font-weight: 600;
    white-space: nowrap;
  }
  .chev { color: var(--muted); font-size: 11px; flex: none; margin-top: 3px; }

  .io { padding: 10px 14px; border-top: 1px solid var(--hair); }
  .io-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 6px; }
  .row { display: flex; justify-content: space-between; gap: 12px; line-height: 1.9; align-items: baseline; }
  .k { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); }
  .v { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
  .ref { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); }

  /* fired — this step produced the verdict; colored by the verdict's tone */
  .tone-go { --fired: var(--go); }
  .tone-hold { --fired: var(--hold); }
  .tone-stop { --fired: var(--stop); }
  .status-fired { border-color: var(--fired); box-shadow: 0 0 0 3px color-mix(in srgb, var(--fired) 20%, transparent); }
  .status-fired .head { background: color-mix(in srgb, var(--fired) 12%, var(--surface)); }
  .status-fired .badge { background: var(--fired); color: white; }

  /* passed — cascade flowed through */
  .status-passed-confirmed .badge { background: color-mix(in srgb, var(--go) 16%, var(--surface)); color: var(--go); }
  .status-passed-no-data { opacity: 0.85; }
  .status-passed-no-data .badge { background: var(--hair); color: var(--muted); }

  /* not-reached — short-circuited before this step */
  .status-not-reached { opacity: 0.4; }
</style>
