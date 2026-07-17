<script lang="ts">
  // One gate, rendered BLIND from the engine's trace record. We never interpret
  // — the engine authored `label`, `condition`, `outcome`, `passed`. A gate that
  // short-circuited (passed === false) is the one that decided the verdict.
  import type { TraceGate } from '$lib/domain/ladder';

  let { gate, fired, dim = false }: { gate: TraceGate; fired: boolean; dim?: boolean } = $props();
  let open = $state(false);

  const tone = $derived(
    fired
      ? 'border-amber-600/60 bg-amber-950/40'
      : dim
        ? 'border-stone-800/60 bg-stone-900/30 opacity-45'
        : 'border-stone-700/50 bg-stone-800/30',
  );
</script>

<button
  onclick={() => (open = !open)}
  class="flex w-full items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-left {tone}"
>
  <span
    class="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold
    {fired
      ? 'bg-amber-500 text-stone-950'
      : gate.passed
        ? 'bg-emerald-700/70 text-emerald-100'
        : 'bg-stone-700 text-stone-400'}"
  >
    {gate.n}
  </span>
  <span class="w-32 flex-none truncate text-xs font-semibold {dim ? 'text-stone-500' : 'text-stone-200'}">
    {gate.label}
  </span>
  <span class="flex-1 truncate text-[11px] {dim ? 'text-stone-600' : 'text-stone-400'}">
    {gate.condition}
  </span>
  <span
    class="flex-none rounded px-1.5 py-0.5 text-[10px] font-medium
    {fired ? 'bg-amber-500/20 text-amber-200' : gate.passed ? 'text-emerald-400' : 'text-stone-500'}"
  >
    {fired ? '● ' : gate.passed ? '✓ ' : ''}{gate.outcome}
  </span>
  <span class="flex-none text-[10px] text-stone-600">{open ? '▾' : '▸'}</span>
</button>

{#if open}
  <div class="mb-1 ml-7 mt-0.5 rounded bg-stone-950/70 p-2 text-[10px] text-stone-400">
    {#each Object.entries(gate.inputs) as [k, v]}
      <div><span class="text-stone-500">{k}</span> = <span class="text-stone-200">{v === null ? '∅' : String(v)}</span></div>
    {/each}
  </div>
{/if}
