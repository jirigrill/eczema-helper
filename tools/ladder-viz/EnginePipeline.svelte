<!-- The engine as a linear sequence: the #521 `LadderExplain.steps` 6-tuple plus
     the verdict, rendered as a plain CSS track — no graph canvas, no camera. Each
     row gets an equal share of the column's actual height (so the layout uses
     whatever space it has, instead of a graph library's zoom-to-fit guessing),
     and clicking a row shows its detail in a fixed side pane rather than growing
     the row in place — so nothing else ever resizes or re-frames. This component
     maps the seam tuple to rows; it holds NO engine knowledge. -->
<script lang="ts">
  import type {
    LadderPrecedenceStep,
    LadderPrecedenceStepName,
    LadderPrecedenceStepStatus,
  } from '$lib/domain/ladder';
  import { fmtDwell, fmtPendingReaction, fmtRung, type DayView } from './adapter';

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

  // Plain-English gloss for each seam status value — the raw enum name
  // ("passed-confirmed" vs. "passed-no-data") reads as one word and hides the
  // distinction that matters: whether the step passed on real evidence, or
  // only because there's nothing logged yet to hold it against.
  const STATUS_LABEL: Record<LadderPrecedenceStepStatus, string> = {
    fired: 'fired — produced the decision',
    'not-reached': 'not reached',
    'passed-confirmed': 'passed — confirmed by evidence',
    'passed-no-data': 'passed — no data yet',
  };
  const STATUS_HINT: Record<LadderPrecedenceStepStatus, string> = {
    fired: "this step's branch produced today's decision",
    'not-reached': 'an earlier step already produced the decision; this one never ran',
    'passed-confirmed': 'ran, and passed because real logged evidence said so',
    'passed-no-data': 'ran, and passed only because nothing has been logged yet to hold it against',
  };

  // The four structural steps carry no payload of their own (`detail` is just
  // `{ step: name }`). Three of them read `LadderStateSnapshot` fields; the
  // first instead reads the ladder's own setup (stage/elimination flag), which
  // is NOT part of the snapshot — each gets its own accurate source label so
  // the pane never claims a source the value didn't actually come from.
  const STRUCTURAL_SOURCE: Record<LadderPrecedenceStepName, string> = {
    'permanent-or-empty': "inputs — read from the ladder's own setup (not the derived state)",
    ceiling: 'inputs — read directly from the derived state (no gate payload of its own)',
    reaction: 'inputs — read directly from the derived state (no gate payload of its own)',
    'skin-worsening': '',
    cadence: '',
    'advance-or-dwell': 'inputs — read directly from the derived state (no gate payload of its own)',
  };
  const STRUCTURAL_INPUTS: Record<LadderPrecedenceStepName, (day: DayView) => { k: string; v: string }[]> = {
    'permanent-or-empty': (d) => [
      { k: 'isPermanentlyEliminated', v: String(d.isPermanentlyEliminated) },
      { k: 'stage rung count', v: String(d.rungs.length) },
    ],
    ceiling: (d) => [{ k: 'ceilingRung', v: fmtRung(d.explain.snapshot.ceilingRung) }],
    reaction: (d) => [{ k: 'pendingReaction', v: fmtPendingReaction(d.explain.snapshot.pendingReaction) }],
    'skin-worsening': () => [],
    cadence: () => [],
    'advance-or-dwell': (d) => [
      { k: 'liveRung', v: fmtRung(d.explain.snapshot.liveRung) },
      { k: 'dwell', v: fmtDwell(d.explain.snapshot.dwell) },
    ],
  };

  function fmt(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'object')
      return 'dose' in (v as Record<string, unknown>) ? String((v as { dose: string }).dose) : JSON.stringify(v);
    return String(v);
  }
  // The gate's own result bundles what it read (inputs) with what it decided
  // (`allowed`, its own local output) in one object — split them so the pane
  // never lists a gate's verdict under an "inputs" heading.
  function gateInputRows(step: LadderPrecedenceStep): { k: string; v: string }[] {
    if (!('gate' in step.detail)) return [];
    const d = step.detail;
    const rows = Object.entries(d.gate)
      .filter(([k]) => k !== 'allowed')
      .map(([k, v]) => ({ k, v: fmt(v) }));
    if ('windowDays' in d) rows.push({ k: 'windowDays', v: String(d.windowDays) });
    if ('cadenceDays' in d) rows.push({ k: 'cadenceDays (effective)', v: String(d.cadenceDays) });
    return rows;
  }
  function gateAllowed(step: LadderPrecedenceStep): boolean | undefined {
    return 'gate' in step.detail ? step.detail.gate.allowed : undefined;
  }

  // The selected row's detail is shown in the side pane; 'decision' or null both
  // show the decision (null is the default, before anything's been clicked).
  let selected = $state<LadderPrecedenceStepName | 'decision' | null>(null);

  const selectedStep = $derived(
    selected && selected !== 'decision' ? day.explain.steps.find((s) => s.name === selected) : undefined,
  );

  function toggle(name: LadderPrecedenceStepName | 'decision') {
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
        <span class="badge" title={STATUS_HINT[step.status]}>{STATUS_LABEL[step.status]}</span>
      </button>
    {/each}
    <button
      type="button"
      class="row decision-row tone-{day.verdictTone}"
      class:sel={selected === 'decision' || selected === null}
      onclick={() => toggle('decision')}
    >
      <span class="idx">✓</span>
      <div class="titles">
        <code class="name">decision</code>
        <code class="fn">LadderExplain.decision</code>
      </div>
      <span class="badge decision-badge" title={day.verdictLabel}>{day.verdictLabel}</span>
    </button>
  </div>

  <div class="detail">
    {#if selectedStep}
      <div class="d-title">{selectedStep.name} · {FN[selectedStep.name]}</div>
      <div class="d-status" title={STATUS_HINT[selectedStep.status]}>{STATUS_LABEL[selectedStep.status]}</div>

      {#if 'gate' in selectedStep.detail}
        <div class="d-sub">inputs — what the gate read</div>
        {#each gateInputRows(selectedStep) as r (r.k)}
          <div class="d-row"><code class="k">{r.k}</code><span class="v">{r.v}</span></div>
        {/each}
        <div class="d-sub d-output">gate output — what it decided</div>
        <div class="d-row"><code class="k">allowed</code><span class="v">{gateAllowed(selectedStep)}</span></div>
      {:else}
        <div class="d-sub">{STRUCTURAL_SOURCE[selectedStep.name]}</div>
        {#each STRUCTURAL_INPUTS[selectedStep.name](day) as r (r.k)}
          <div class="d-row"><code class="k">{r.k}</code><span class="v">{r.v}</span></div>
        {/each}
      {/if}

      {#if selectedStep.status === 'fired'}
        <div class="d-sub d-output">engine decision — this step produced it</div>
        <div class="d-label">{day.verdictLabel}</div>
        <pre class="d-json">{day.verdictJson}</pre>
      {/if}
    {:else}
      <div class="d-title">engine decision · LadderDecision · {day.date}</div>
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
  .decision-badge { max-width: 220px; overflow: hidden; text-overflow: ellipsis; text-transform: none; letter-spacing: 0; }

  /* fired — this step produced the decision; colored by the decision's tone */
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

  .decision-row { border-style: dashed; }
  .decision-row.tone-go { background: color-mix(in srgb, var(--go) 8%, var(--surface)); }
  .decision-row.tone-hold { background: color-mix(in srgb, var(--hold) 8%, var(--surface)); }
  .decision-row.tone-stop { background: color-mix(in srgb, var(--stop) 8%, var(--surface)); }

  .detail {
    flex: 1 1 44%;
    min-width: 0;
    overflow-y: auto;
    border: 1.5px solid var(--hair);
    border-radius: 10px;
    background: var(--surface);
    padding: 16px 18px;
  }
  .d-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .d-status { display: inline-block; font-size: 12px; font-weight: 600; color: var(--ink); margin-bottom: 14px; cursor: help; border-bottom: 1px dotted var(--muted); }
  .d-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 8px; }
  .d-output { margin-top: 16px; }
  .d-row { display: flex; justify-content: space-between; gap: 12px; line-height: 2.1; align-items: baseline; font-size: 13px; border-bottom: 1px solid var(--hair); }
  .k { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); }
  .v { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }

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
