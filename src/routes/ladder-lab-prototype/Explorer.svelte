<script lang="ts">
  // Shell: dummy-data DAG explorer. Three innovative, completely different
  // DAG-shaped layouts (Circuit / Sankey / Subway), switchable via a floating
  // bar + ?layout=. A shared transport plays through the fictional scenario.
  // No engine, no real data — pure look-and-feel.
  import '../../app.css';
  import { DAYS, inputTone } from './fixture';
  import LayoutCircuit from './LayoutCircuit.svelte';
  import LayoutSankey from './LayoutSankey.svelte';
  import LayoutSubway from './LayoutSubway.svelte';

  let cursor = $state(0);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;
  const day = $derived(DAYS[Math.min(cursor, DAYS.length - 1)]!);

  function toggle() {
    playing = !playing;
    if (playing) {
      timer = setInterval(() => {
        if (cursor >= DAYS.length - 1) { playing = false; clearInterval(timer!); return; }
        cursor += 1;
      }, 1200);
    } else if (timer) clearInterval(timer);
  }

  const layouts = [
    { id: 'circuit', label: 'Circuit DAG' },
    { id: 'sankey', label: 'Flow / Sankey' },
    { id: 'subway', label: 'Subway map' },
  ] as const;
  type LayoutId = (typeof layouts)[number]['id'];
  function initial(): LayoutId {
    if (typeof window === 'undefined') return 'circuit';
    const p = new URLSearchParams(window.location.search).get('layout');
    return layouts.some((l) => l.id === p) ? (p as LayoutId) : 'circuit';
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
</script>

<div class="min-h-screen bg-stone-950 p-5 pb-24 font-mono text-sm text-stone-200">
  <h1 class="mb-1 text-xs uppercase tracking-widest text-stone-500">
    ladder-lab · DAG explorer <span class="ml-2 text-stone-600">— dummy data, look & feel only</span>
  </h1>
  <p class="mb-4 text-[11px] text-stone-600">
    the decision engine drawn as a directed graph: inputs → gate cascade → verdict. three takes to compare.
  </p>

  <!-- transport -->
  <section class="mb-4 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
    <div class="flex items-center gap-3">
      <button onclick={toggle} class="rounded-md bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-900 hover:bg-white">
        {playing ? '❚❚' : '▶'}
      </button>
      <input type="range" min="0" max={DAYS.length - 1} bind:value={cursor} class="flex-1 accent-stone-300" />
      <span class="w-16 text-right text-xs text-stone-400">{day.date}</span>
    </div>
    <!-- input chips for the current day -->
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <span class="text-[10px] uppercase tracking-wide text-stone-500">inputs:</span>
      {#each day.inputs as chip}
        <span class="inline-flex items-center gap-1 rounded-full border border-stone-700 bg-stone-800/50 px-2 py-0.5 text-[11px]">
          <span class="h-1.5 w-1.5 rounded-full {inputTone[chip.kind].dot}"></span>
          <span class={inputTone[chip.kind].text}>{chip.kind}</span>
          <span class="text-stone-300">{chip.text}</span>
        </span>
      {/each}
      <span class="ml-auto text-[11px] text-stone-500">live rung: <span class="text-emerald-300">{day.liveRung}</span></span>
    </div>
  </section>

  {#if layout === 'circuit'}
    <LayoutCircuit {day} />
  {:else if layout === 'sankey'}
    <LayoutSankey {day} {cursor} />
  {:else}
    <LayoutSubway {day} />
  {/if}

  <!-- floating switcher -->
  <div class="fixed inset-x-0 bottom-0 flex justify-center gap-1 border-t border-stone-800 bg-stone-900/90 p-2 backdrop-blur">
    {#each layouts as l}
      <button onclick={() => pick(l.id)}
        class="rounded-md px-4 py-1.5 text-xs font-semibold transition
          {layout === l.id ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}">
        {l.label}
      </button>
    {/each}
  </div>
</div>
