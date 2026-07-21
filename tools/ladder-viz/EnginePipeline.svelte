<!-- The engine as a linear sequence: the #521 `LadderExplain.steps` 6-tuple plus
     the verdict, rendered as a plain CSS track — no graph canvas, no camera. Each
     row gets an equal share of the column's actual height (so the layout uses
     whatever space it has, instead of a graph library's zoom-to-fit guessing),
     and clicking a row shows its detail in a fixed side pane rather than growing
     the row in place — so nothing else ever resizes or re-frames. This component
     maps the seam tuple to rows; it holds NO engine knowledge. -->
<script lang="ts">
  import type { LadderPrecedenceStep, LadderPrecedenceStepName } from '$lib/domain/ladder';
  import type { DayView } from './adapter';

  let { day }: { day: DayView } = $props();

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

  function fmt(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'object')
      return 'dose' in (v as Record<string, unknown>) ? String((v as { dose: string }).dose) : JSON.stringify(v);
    return String(v);
  }
  // Reflect over the gate result object + its paired threshold — generic.
  function gateRows(step: LadderPrecedenceStep): { k: string; v: string }[] {
    if (!('gate' in step.detail)) return [];
    const d = step.detail;
    const rows = Object.entries(d.gate).map(([k, v]) => ({ k, v: fmt(v) }));
    if ('windowDays' in d) rows.push({ k: 'windowDays', v: String(d.windowDays) });
    if ('cadenceDays' in d) rows.push({ k: 'cadenceDays (effective)', v: String(d.cadenceDays) });
    return rows;
  }

  // The selected row's detail is shown in the side pane; 'verdict' or null both
  // show the verdict (null is the default, before anything's been clicked).
  let selected = $state<LadderPrecedenceStepName | 'verdict' | null>(null);

  const selectedStep = $derived(
    selected && selected !== 'verdict' ? day.explain.steps.find((s) => s.name === selected) : undefined,
  );

  function toggle(name: LadderPrecedenceStepName | 'verdict') {
    selected = selected === name ? null : name;
  }
</script>

<div class="pipeline">
  <div class="track">
    {#each day.explain.steps as step, i (step.name)}
      <button
        type="button"
        class="row status-{step.status} tone-{day.verdictTone}"
        class:sel={selected === step.name}
        onclick={() => toggle(step.name)}
      >
        <span class="idx">{i + 1}</span>
        <div class="titles">
          <code class="name">{step.name}</code>
          <code class="fn">{FN[step.name]}</code>
        </div>
        <span class="badge">{step.status}</span>
      </button>
    {/each}
    <button
      type="button"
      class="row verdict-row tone-{day.verdictTone}"
      class:sel={selected === 'verdict' || selected === null}
      onclick={() => toggle('verdict')}
    >
      <span class="idx">✓</span>
      <div class="titles">
        <code class="name">verdict</code>
        <code class="fn">LadderExplain.decision</code>
      </div>
      <span class="badge verdict-badge" title={day.verdictLabel}>{day.verdictLabel}</span>
    </button>
  </div>

  <div class="detail">
    {#if selectedStep}
      <div class="d-title">{selectedStep.name} · {FN[selectedStep.name]}</div>
      {#if 'gate' in selectedStep.detail}
        <div class="d-sub">gate result — read from the engine</div>
        {#each gateRows(selectedStep) as r (r.k)}
          <div class="d-row"><code class="k">{r.k}</code><span class="v">{r.v}</span></div>
        {/each}
      {:else}
        <div class="d-sub">no payload — evidence in the snapshot</div>
        <div class="ref">{SNAP_REF[selectedStep.name]}</div>
      {/if}
    {:else}
      <div class="d-title">engine verdict · LadderDecision · {day.date}</div>
      <div class="d-label">{day.verdictLabel}</div>
      <pre class="d-json">{day.verdictJson}</pre>
    {/if}
  </div>
</div>

<style>
  .pipeline { display: flex; gap: 14px; height: 100%; padding: 12px; }

  .track { flex: 1 1 56%; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .row {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    border: 1.5px solid var(--hair);
    border-radius: 10px;
    background: var(--surface);
    font-size: 13px;
    text-align: left;
    font-family: inherit;
    color: inherit;
    cursor: pointer;
  }
  .row.sel { border-color: var(--ink); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink) 16%, transparent); }
  .idx {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--muted);
    background: var(--surface-2);
    border: 1px solid var(--hair);
    border-radius: 6px;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    flex: none;
    font-size: 12px;
  }
  .titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; font-weight: 700; color: var(--ink); }
  .fn { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--hair);
    color: var(--muted);
    flex: none;
    font-weight: 600;
    white-space: nowrap;
  }
  .verdict-badge { max-width: 220px; overflow: hidden; text-overflow: ellipsis; text-transform: none; letter-spacing: 0; }

  /* fired — this step produced the verdict; colored by the verdict's tone */
  .tone-go { --fired: var(--go); }
  .tone-hold { --fired: var(--hold); }
  .tone-stop { --fired: var(--stop); }
  .status-fired { border-color: var(--fired); box-shadow: 0 0 0 2px color-mix(in srgb, var(--fired) 20%, transparent); }
  .status-fired .badge { background: var(--fired); color: white; }
  .status-fired.sel { box-shadow: 0 0 0 2px color-mix(in srgb, var(--fired) 20%, transparent), 0 0 0 4px color-mix(in srgb, var(--ink) 14%, transparent); }

  /* passed — cascade flowed through */
  .status-passed-confirmed .badge { background: color-mix(in srgb, var(--go) 16%, var(--surface)); color: var(--go); }
  .status-passed-no-data { opacity: 0.85; }
  .status-passed-no-data .badge { background: var(--hair); color: var(--muted); }

  /* not-reached — short-circuited before this step */
  .status-not-reached { opacity: 0.45; }

  .verdict-row { border-style: dashed; }
  .verdict-row.tone-go { background: color-mix(in srgb, var(--go) 8%, var(--surface)); }
  .verdict-row.tone-hold { background: color-mix(in srgb, var(--hold) 8%, var(--surface)); }
  .verdict-row.tone-stop { background: color-mix(in srgb, var(--stop) 8%, var(--surface)); }

  .detail {
    flex: 1 1 44%;
    min-width: 0;
    overflow-y: auto;
    border: 1.5px solid var(--hair);
    border-radius: 10px;
    background: var(--surface);
    padding: 16px 18px;
  }
  .d-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .d-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 8px; }
  .d-row { display: flex; justify-content: space-between; gap: 12px; line-height: 2.1; align-items: baseline; font-size: 13px; border-bottom: 1px solid var(--hair); }
  .k { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); }
  .v { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
  .ref { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); }

  .d-label { font-size: 22px; font-weight: 800; margin: 0 0 12px; color: var(--ink); }
  .d-json {
    display: block;
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
    background: var(--surface-2);
    padding: 12px 14px;
    border-radius: 8px;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
