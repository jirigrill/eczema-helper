<script lang="ts">
  // Shared transport: play/pause, scrubber, and a compact day timeline. Emits
  // the current cursor via bindable. Timeline chips show each day's input kinds.
  import type { Step } from './engine';
  import { inputTone } from './tokens';

  let {
    steps,
    cursor = $bindable(),
  }: { steps: Step[]; cursor: number } = $props();

  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function toggle() {
    playing = !playing;
    if (playing) {
      timer = setInterval(() => {
        if (cursor >= steps.length - 1) {
          playing = false;
          clearInterval(timer!);
          return;
        }
        cursor += 1;
      }, 1100);
    } else if (timer) clearInterval(timer);
  }

  function kindsOn(s: Step) {
    return [...new Set(s.events.map((e) => e.kind))];
  }
</script>

<div class="flex items-center gap-3">
  <button
    onclick={toggle}
    class="rounded-md bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-900 hover:bg-white"
  >
    {playing ? '❚❚' : '▶'}
  </button>
  <input
    type="range"
    min="0"
    max={steps.length - 1}
    bind:value={cursor}
    class="flex-1 accent-stone-300"
  />
  <span class="w-24 text-right text-xs text-stone-400">{steps[cursor]?.date}</span>
</div>

<div class="mt-2 flex gap-1 overflow-x-auto">
  {#each steps as s, i}
    <button
      onclick={() => (cursor = i)}
      class="flex min-w-[52px] flex-1 flex-col items-center gap-1 rounded border px-1 py-1 text-[10px] transition
        {i === cursor ? 'border-stone-400 bg-stone-700/50' : 'border-stone-800 bg-stone-900/40'}
        {i <= cursor ? '' : 'opacity-40'}"
    >
      <span class="text-stone-400">{s.date.slice(5)}</span>
      <span class="flex gap-0.5">
        {#each kindsOn(s) as k}
          <span class="h-1.5 w-1.5 rounded-full {inputTone[k].dot}"></span>
        {/each}
      </span>
    </button>
  {/each}
</div>
