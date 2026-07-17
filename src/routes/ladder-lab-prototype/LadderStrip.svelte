<script lang="ts">
  // Compact vertical ladder. Less dense than before: one line per rung, the live
  // rung marked with a filled dot + label, everything else quiet. All state
  // (which rung is live, ceiling, resting) comes from the engine's trace
  // snapshot — never recomputed here.
  import type { LadderStep, LadderStateSnapshot } from '$lib/domain/ladder';

  let {
    steps,
    state,
  }: { steps: LadderStep[]; state: LadderStateSnapshot | null } = $props();

  const liveIdx = $derived(state?.liveIndex ?? null);
  const ceilingIdx = $derived(
    state?.ceilingRung == null ? null : steps.findIndex((s) => s.anchor === state!.ceilingRung),
  );
  const restingIdx = $derived(
    state?.pendingReaction == null
      ? null
      : steps.findIndex((s) => s.anchor === state!.pendingReaction!.rung),
  );
</script>

<div class="flex flex-col-reverse gap-0.5">
  {#each steps as r, i}
    {@const isLive = liveIdx === i}
    {@const aboveCeiling = ceilingIdx !== null && i > ceilingIdx}
    <div
      class="flex items-center gap-2 rounded px-2 py-1 text-xs
        {isLive
        ? 'bg-emerald-800/40 ring-1 ring-emerald-500/50'
        : aboveCeiling
          ? 'opacity-30'
          : 'bg-stone-800/20'}"
    >
      <span
        class="flex h-2.5 w-2.5 flex-none rounded-full
        {isLive ? 'bg-emerald-400' : 'bg-stone-600'}"
      ></span>
      <span class="w-3 flex-none text-[10px] text-stone-500">{i}</span>
      <span class="flex-1 {isLive ? 'font-semibold text-emerald-100' : 'text-stone-300'}">{r.anchor}</span>
      {#if isLive}<span class="text-[10px] text-emerald-300">live</span>{/if}
      {#if ceilingIdx === i}<span class="rounded bg-rose-800/70 px-1 text-[9px] text-rose-100">ceiling</span>{/if}
      {#if restingIdx === i}<span class="rounded bg-sky-800/70 px-1 text-[9px] text-sky-100">resting</span>{/if}
      {#if r.isEvaluationCheckpoint}<span class="text-[9px] text-amber-400">✦</span>{/if}
    </div>
  {/each}
</div>
