<script lang="ts">
  // Shell: runs the scenario through the REAL engine once, then renders ONE of
  // three candidate layouts (switchable via ?layout= + a floating bottom bar).
  // The transport (play/scrub) is shared. Everything below is a blind renderer
  // of the engine's trace — no engine logic lives in this folder.
  import { runScenario, DEFAULT_SCENARIO } from './engine';
  import Transport from './Transport.svelte';
  import LayoutInspector from './LayoutInspector.svelte';
  import LayoutSplit from './LayoutSplit.svelte';
  import LayoutTraceLog from './LayoutTraceLog.svelte';

  const run = runScenario(DEFAULT_SCENARIO);
  let cursor = $state(0);

  const layouts = [
    { id: 'inspector', label: 'Inspector' },
    { id: 'split', label: 'Split' },
    { id: 'log', label: 'Trace log' },
  ] as const;
  type LayoutId = (typeof layouts)[number]['id'];

  function initial(): LayoutId {
    if (typeof window === 'undefined') return 'inspector';
    const p = new URLSearchParams(window.location.search).get('layout');
    return layouts.some((l) => l.id === p) ? (p as LayoutId) : 'inspector';
  }
  let layout = $state<LayoutId>(initial());
  function pick(id: LayoutId) {
    layout = id;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('layout', id);
      history.replaceState({}, '', url);
    }
  }

  const step = $derived(run.steps[Math.min(cursor, run.steps.length - 1)]!);
</script>

<div class="min-h-screen bg-stone-950 p-4 pb-20 font-mono text-sm text-stone-200">
  <h1 class="mb-3 text-xs uppercase tracking-widest text-stone-500">
    ladder-lab · {DEFAULT_SCENARIO.allergen} / {DEFAULT_SCENARIO.phase} / {DEFAULT_SCENARIO.stage}
    <span class="ml-2 text-stone-600">— blind renderer of the engine's own trace</span>
  </h1>

  {#if run.error}
    <div class="rounded border border-rose-800 bg-rose-950/50 p-3 text-rose-200">engine error: {run.error}</div>
  {:else}
    <section class="mb-4 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
      <Transport steps={run.steps} bind:cursor />
    </section>

    {#if layout === 'inspector'}
      <LayoutInspector {run} {step} />
    {:else if layout === 'split'}
      <LayoutSplit {run} {step} />
    {:else}
      <LayoutTraceLog {run} bind:cursor />
    {/if}
  {/if}

  <!-- floating layout switcher -->
  <div class="fixed inset-x-0 bottom-0 flex justify-center gap-1 border-t border-stone-800 bg-stone-900/90 p-2 backdrop-blur">
    {#each layouts as l}
      <button
        onclick={() => pick(l.id)}
        class="rounded-md px-4 py-1.5 text-xs font-semibold transition
          {layout === l.id ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}"
      >
        {l.label}
      </button>
    {/each}
  </div>
</div>
