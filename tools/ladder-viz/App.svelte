<!-- Ladder-engine single-day inspector. Two zones: a left "situation" column
     (ladder + the day's inputs, with a manual editor in manual mode) and the
     engine pipeline resolving to the verdict on the right, under a snapshot bar.
     Every component renders the real #521 `LadderExplain` shape (from
     `$lib/domain/ladder` via `computeDay`) — none import engine decision logic. -->
<script lang="ts">
  import type { FeedingStage } from '$lib/domain/canonical-allergen';
  import type { LadderAllergenId, PortionKind } from '$lib/domain/models';

  import { computeDay } from './adapter';
  import DateStrip from './DateStrip.svelte';
  import EnginePipeline from './EnginePipeline.svelte';
  import InputsPanel from './InputsPanel.svelte';
  import type { JourneyRun } from './journey';
  import LadderRail from './LadderRail.svelte';
  import ManualEditor from './ManualEditor.svelte';
  import {
    addISO,
    buildRun,
    LADDERS,
    PHASES,
    STAGES,
    type ReintroductionPhase,
    type RunEvent,
  } from './run-events';
  import { parseScenario } from './scenario-loader';
  import SnapshotBar from './SnapshotBar.svelte';

  type Mode = 'scenario' | 'manual';
  let mode = $state<Mode>('scenario');

  // ── Scenario replay mode ─────────────────────────────────────────────────────
  // Every `scenarios/*.yaml` is loaded as raw text at build time and parsed +
  // Zod-validated on demand. A malformed scenario throws in `parseScenario`,
  // surfaced in the header rather than silently dropped.
  const files = import.meta.glob('./scenarios/*.yaml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const scenarios = Object.entries(files)
    .map(([path, text]) => ({ name: path.replace(/^.*\/(.+)\.yaml$/, '$1'), text }))
    .sort((a, b) => a.name.localeCompare(b.name));

  let selectedScenario = $state(scenarios[0]?.name ?? '');

  const scenarioRun = $derived.by<{ run: JourneyRun | null; error: string | null }>(() => {
    const chosen = scenarios.find((s) => s.name === selectedScenario);
    if (!chosen) return { run: null, error: null };
    try {
      return { run: parseScenario(chosen.text), error: null };
    } catch (err) {
      return { run: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // ── Manual mode ──────────────────────────────────────────────────────────────
  // A free per-day editor over a fixed calendar, building the SAME `JourneyRun`
  // scenario replay produces via the shared `buildRun`. Setup stays editable; the
  // event stream is the single source both modes feed the engine.
  const ALLERGENS: LadderAllergenId[] = [...LADDERS.keys()].sort();
  const MANUAL_START = '2026-06-01';
  const MANUAL_DAYS = Array.from({ length: 28 }, (_, i) => addISO(MANUAL_START, i));

  let setupAllergen = $state<LadderAllergenId>(ALLERGENS[0] ?? 'peanuts');
  let setupPhase = $state<ReintroductionPhase>('reintroduction');
  let setupStage = $state<FeedingStage>('breastfed');
  let setupPermanent = $state(false);
  let manualEvents = $state<RunEvent[]>([]);

  const manualRun = $derived<JourneyRun>(
    buildRun(
      { allergen: setupAllergen, phase: setupPhase, stage: setupStage, permanent: setupPermanent },
      MANUAL_DAYS,
      manualEvents,
    ),
  );

  // ── Shared render — one `JourneyRun`, one selected day ───────────────────────
  const run = $derived<JourneyRun | null>(mode === 'manual' ? manualRun : scenarioRun.run);
  const loadError = $derived<string | null>(mode === 'manual' ? null : scenarioRun.error);

  let selected = $state('');

  // Keep the selected day inside the current run's calendar: on any run change,
  // if the day left with the old run, snap to a day a few in (or the first).
  $effect(() => {
    const days = run?.days ?? [];
    if (!days.includes(selected)) selected = days[Math.min(4, days.length - 1)] ?? '';
  });

  const day = $derived(run && selected ? computeDay(run, selected) : null);
  const rungs = $derived(run ? (run.defaultLadder.stages[run.stage] ?? []) : []);

  // The day's dose is set by clicking a rung on the Ladder Rail — the single
  // place manual mode edits it, so it isn't echoed by a second dose picker.
  const curDoseAnchor = $derived(
    manualEvents.find(
      (e): e is Extract<RunEvent, { meal: unknown }> => e.date === selected && 'meal' in e,
    )?.meal,
  );
  function toggleDose(anchor: PortionKind) {
    const kept = manualEvents.filter((e) => !(e.date === selected && 'meal' in e));
    manualEvents = curDoseAnchor === anchor ? kept : [...kept, { date: selected, meal: anchor }];
  }
</script>

<div class="app">
  <header class="topbar">
    <div class="brand">ladder-engine inspector</div>

    <div class="mode-toggle">
      <button class:on={mode === 'scenario'} onclick={() => (mode = 'scenario')}>scenario</button>
      <button class:on={mode === 'manual'} onclick={() => (mode = 'manual')}>manual</button>
    </div>

    {#if mode === 'scenario'}
      <label class="picker">
        scenario
        <select bind:value={selectedScenario}>
          {#each scenarios as scenario (scenario.name)}
            <option value={scenario.name}>{scenario.name}</option>
          {/each}
        </select>
      </label>
    {:else}
      <span class="picker">
        setup
        <select bind:value={setupAllergen}>
          {#each ALLERGENS as a (a)}<option value={a}>{a}</option>{/each}
        </select>
        <select bind:value={setupPhase}>
          {#each PHASES as p (p)}<option value={p}>{p}</option>{/each}
        </select>
        <select bind:value={setupStage}>
          {#each STAGES as s (s)}<option value={s}>{s}</option>{/each}
        </select>
        <label class="inline"><input type="checkbox" bind:checked={setupPermanent} /> permanent</label>
        <button class="reset" onclick={() => (manualEvents = [])} disabled={manualEvents.length === 0}>
          clear all
        </button>
      </span>
    {/if}

    {#if day}
      <div class="verdict">
        <span class="vlabel">verdict</span>
        <span class="verdict-pill tone-{day.verdictTone}" title={day.verdictLabel}>{day.verdictLabel}</span>
      </div>
    {/if}
  </header>

  {#if loadError}
    <div class="error">load error: {loadError}</div>
  {/if}

  {#if run && day}
    <DateStrip days={run.days} bind:selected />

    <main class="grid">
      <aside class="col situation">
        {#if mode === 'manual'}
          <ManualEditor bind:events={manualEvents} date={selected} />
        {/if}
        <LadderRail
          {day}
          manual={mode === 'manual' ? { rungs, current: curDoseAnchor, onToggle: toggleDose } : undefined}
        />
        <InputsPanel {day} />
      </aside>

      <section class="col engine">
        <div class="col-h">
          engine · explainLadderMove trace
          <span class="note">read-only — rendered from the real seam shape · click a node to unroll</span>
        </div>
        <SnapshotBar snapshot={day.explain.snapshot} />
        <div class="flow"><EnginePipeline {day} /></div>
      </section>
    </main>
  {/if}
</div>

<style>
  .app { display: flex; flex-direction: column; min-height: 100vh; }
  .topbar { display: flex; align-items: center; gap: 18px; padding: 9px 16px; background: var(--ink); color: white; flex-wrap: wrap; }
  .brand { font-weight: 700; letter-spacing: 0.01em; }

  .mode-toggle { display: flex; gap: 2px; background: rgba(255, 255, 255, 0.1); padding: 2px; border-radius: 8px; }
  .mode-toggle button {
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 6px;
    cursor: pointer;
  }
  .mode-toggle button.on { background: var(--surface); color: var(--ink); }

  .picker { display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255, 255, 255, 0.7); }
  .picker .inline { display: inline-flex; align-items: center; gap: 3px; }
  .picker select { font-size: 12px; padding: 2px 4px; border-radius: 6px; }
  .reset {
    font-size: 11px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: transparent;
    color: rgba(255, 255, 255, 0.8);
    border-radius: 6px;
    padding: 3px 8px;
    cursor: pointer;
  }
  .reset:disabled { opacity: 0.4; cursor: default; }

  .verdict { margin-left: auto; display: flex; align-items: center; gap: 9px; flex: none; max-width: 45%; }
  .vlabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.6; flex: none; }
  .verdict-pill {
    font-weight: 700;
    padding: 5px 14px;
    border-radius: 999px;
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .tone-go { background: var(--go); }
  .tone-hold { background: var(--hold); }
  .tone-stop { background: var(--stop); }

  .error { padding: 8px 16px; background: color-mix(in srgb, var(--stop) 12%, var(--surface)); color: var(--stop); font-size: 13px; }

  .grid { flex: 1; display: grid; grid-template-columns: 320px 1fr; min-height: 0; }
  .col { min-height: 0; }
  .col.situation { border-right: 1px solid var(--hair); background: var(--surface); overflow-y: auto; display: flex; flex-direction: column; }
  .col.engine { display: flex; flex-direction: column; background: var(--canvas); }
  .col-h {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    border-bottom: 1px solid var(--hair);
    background: var(--surface);
  }
  .note { text-transform: none; letter-spacing: 0; font-size: 10px; opacity: 0.75; }
  .flow { flex: 1; min-height: 0; }
</style>
