<script lang="ts">
  import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import type { FeedingStage } from '$lib/domain/canonical-allergen';
  import type {
    AllergenOutcome,
    LadderAllergenId,
    PortionKind,
    RegionLevel,
  } from '$lib/domain/models';
  import DayNode from './DayNode.svelte';
  import Cascade from './Cascade.svelte';
  import { placeholderDay, replayJourney, type JourneyDay, type JourneyRun } from './journey';
  import {
    advanceDay,
    logEval,
    logMeal,
    logSkin,
    startManualRun,
    toRun,
    type ManualSession,
  } from './manual';
  import { FUTURE_KINDS, spanLabel } from './node-style';
  import { parseScenario } from './scenario-loader';
  import {
    LADDERS,
    OUTCOMES,
    PHASES,
    PORTION_KINDS,
    STAGES,
    type ReintroductionPhase,
    type RunSetup,
  } from './run-events';

  const nodeTypes = { day: DayNode };

  type Mode = 'scenario' | 'manual';
  let mode = $state<Mode>('scenario');

  // ── Scenario replay mode (#532) ────────────────────────────────────────────

  // Every `scenarios/*.yaml` is loaded as raw text at build time and parsed +
  // Zod-validated on demand (#532). A malformed scenario throws in `parseScenario`,
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

  // ── Manual mode (#533) ──────────────────────────────────────────────────────

  // The run setup fields — the same as a scenario header — editable ONLY before
  // the session starts. Once started they are frozen inside the `ManualSession`
  // and never re-exposed: no mid-run stage/phase/permanent switch exists.
  const ALLERGENS: LadderAllergenId[] = [...LADDERS.keys()].sort();

  let setupAllergen: LadderAllergenId = $state(ALLERGENS[0] ?? 'peanuts');
  let setupPhase: ReintroductionPhase = $state('reintroduction');
  let setupStage: FeedingStage = $state('breastfed');
  let setupPermanent = $state(false);

  let session = $state<ManualSession | null>(null);
  const started = $derived(session !== null);

  function beginSession() {
    const setup: RunSetup = {
      allergen: setupAllergen,
      phase: setupPhase,
      stage: setupStage,
      permanent: setupPermanent,
    };
    session = startManualRun(setup);
  }

  function resetSession() {
    session = null;
  }

  // Each log dropdown applies its action to today, then snaps back to its
  // placeholder so the same value can be picked twice in a row.
  function applyLog(el: HTMLSelectElement, next: ManualSession) {
    session = next;
    el.selectedIndex = 0;
  }

  const today = $derived(session ? session.days[session.days.length - 1]! : null);

  // ── Shared render — both modes are projected onto one `JourneyRun` ───────────

  const run = $derived<JourneyRun | null>(
    mode === 'manual' ? (session ? toRun(session) : null) : scenarioRun.run,
  );
  const loadError = $derived<string | null>(mode === 'manual' ? null : scenarioRun.error);

  const journey = $derived(run ? replayJourney(run) : []);

  const COL_GAP = 240;

  // The day-spine: one node per collapsed box, laid left→right.
  const spineNodes = $derived<Node[]>(
    journey.map((day, i) => ({
      id: `d${i}`,
      type: 'day',
      position: { x: i * COL_GAP, y: 0 },
      data: { day, span: spanLabel(day.fromDate, day.toDate) },
    })),
  );

  // Edges come from replay, never a frozen adjacency matrix (#519): each is the
  // day-boundary where the box changed, labelled with the channel that changed it.
  const spineEdges = $derived<Edge[]>(
    journey.slice(1).map((day, i) => ({
      id: `e${i}`,
      source: `d${i}`,
      target: `d${i + 1}`,
      label: day.enteredVia ?? '',
      animated: day.kind === 'resting',
    })),
  );

  // The future arms greyed off the spine, so the vocabulary is future-complete
  // (#519). Any future arm this run actually reached already renders on the spine,
  // so it is dropped here — a kind is never drawn twice.
  const spineKinds = $derived(new Set(journey.map((day) => day.kind)));
  const futureNodes = $derived<Node[]>(
    FUTURE_KINDS.filter((kind) => !spineKinds.has(kind)).map((kind, i) => ({
      id: `f${i}`,
      type: 'day',
      position: { x: i * COL_GAP, y: 180 },
      data: {
        day: placeholderDay(kind),
        span: 'future',
      },
      selectable: false,
    })),
  );

  const nodes = $derived<Node[]>([...spineNodes, ...futureNodes]);
  const edges = $derived<Edge[]>(spineEdges);

  // Cascade drill-in (#531): clicking a day opens its 6-step precedence cascade.
  // The future arms are inert vocabulary (`selectable: false`, `explain: null`),
  // so a click on one opens nothing.
  let selected: JourneyDay | null = $state(null);

  // Switching scenarios, modes, or any run change drops any open cascade — the
  // clicked day belongs to the run we're leaving.
  $effect(() => {
    void run;
    void mode;
    selected = null;
  });

  function onnodeclick({ node }: { node: Node }) {
    const day = node.data.day as JourneyDay;
    selected = day.explain ? day : null;
  }

  // Re-fit the graph whenever the source run changes (scenario switch, or a manual
  // action that grows the spine) so a long run stays framed.
  const fitKey = $derived(
    mode === 'manual' ? `manual:${journey.length}` : `scenario:${selectedScenario}`,
  );
</script>

<div class="app">
  <header>
    <strong>Ladder engine journey</strong>
    <label>
      · mode
      <select bind:value={mode}>
        <option value="scenario">scenario</option>
        <option value="manual">manual</option>
      </select>
    </label>

    {#if mode === 'scenario'}
      <label>
        · scenario
        <select bind:value={selectedScenario}>
          {#each scenarios as scenario (scenario.name)}
            <option value={scenario.name}>{scenario.name}</option>
          {/each}
        </select>
      </label>
    {:else if !started}
      <span class="setup">
        · setup
        <select bind:value={setupAllergen}>
          {#each ALLERGENS as a (a)}<option value={a}>{a}</option>{/each}
        </select>
        <select bind:value={setupPhase}>
          {#each PHASES as p (p)}<option value={p}>{p}</option>{/each}
        </select>
        <select bind:value={setupStage}>
          {#each STAGES as s (s)}<option value={s}>{s}</option>{/each}
        </select>
        <label class="inline"
          ><input type="checkbox" bind:checked={setupPermanent} /> permanent</label
        >
        <button onclick={beginSession}>start run</button>
      </span>
    {:else}
      <span class="setup">
        · {session!.setup.allergen} · {session!.setup.phase} · {session!.setup.stage}
        {session!.setup.permanent ? ' · permanent' : ''} · today
        <code>{today}</code>
      </span>
      <span class="actions">
        · log
        <select
          onchange={(e) =>
            applyLog(
              e.currentTarget,
              logMeal(session!, e.currentTarget.value as PortionKind | 'none'),
            )}
        >
          <option value="" disabled selected>meal…</option>
          {#each PORTION_KINDS as p (p)}<option value={p}>{p}</option>{/each}
          <option value="none">none</option>
        </select>
        <select
          onchange={(e) =>
            applyLog(
              e.currentTarget,
              logSkin(session!, Number(e.currentTarget.value) as RegionLevel),
            )}
        >
          <option value="" disabled selected>skin…</option>
          {#each [0, 1, 2, 3] as lvl (lvl)}<option value={lvl}>{lvl}</option>{/each}
        </select>
        <select
          onchange={(e) =>
            applyLog(e.currentTarget, logEval(session!, e.currentTarget.value as AllergenOutcome))}
        >
          <option value="" disabled selected>eval…</option>
          {#each OUTCOMES as o (o)}<option value={o}>{o}</option>{/each}
        </select>
        <button onclick={() => (session = advanceDay(session!))}>advance day ▸</button>
        <button class="reset" onclick={resetSession}>reset</button>
      </span>
    {/if}

    {#if run}
      <span>· {run.allergenId} · replayed through <code>explainLadderMove</code></span>
    {/if}
    {#if loadError}
      <span class="error">· load error: {loadError}</span>
    {/if}
  </header>
  <div class="canvas">
    {#key fitKey}
      <SvelteFlow {nodes} {edges} {nodeTypes} {onnodeclick} fitView>
        <Background />
        <Controls />
      </SvelteFlow>
    {/key}
    {#if selected}
      <Cascade day={selected} onclose={() => (selected = null)} />
    {/if}
  </div>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: system-ui, sans-serif;
  }
  header {
    padding: 10px 14px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 14px;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  header span {
    color: #64748b;
  }
  header label {
    color: #64748b;
  }
  header label.inline {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  header select {
    font-size: 13px;
    padding: 2px 4px;
  }
  header button {
    font-size: 13px;
    padding: 2px 8px;
    cursor: pointer;
  }
  header button.reset {
    color: #b91c1c;
  }
  header code {
    font-size: 12px;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 4px;
  }
  header .error {
    color: #b91c1c;
  }
  .canvas {
    flex: 1;
    min-height: 0;
    position: relative;
  }
</style>
