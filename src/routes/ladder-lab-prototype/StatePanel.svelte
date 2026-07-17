<script lang="ts">
  // The engine's internal state snapshot — the real "insides" of
  // deriveLadderState (mode, pendingReaction, ceiling, dwell) plus the folded
  // event replay. Every field comes straight from the trace; nothing derived here.
  import type { LadderStateSnapshot } from '$lib/domain/ladder';

  let { state, showReplay = true }: { state: LadderStateSnapshot | null; showReplay?: boolean } =
    $props();
</script>

{#if state}
  <div class="space-y-1 text-[11px]">
    <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
      <div>liveRung <span class="float-right font-semibold text-fuchsia-200">{state.liveRung ?? '∅'}</span></div>
      <div>mode <span class="float-right text-stone-200">{state.mode}</span></div>
      <div>lastPassing <span class="float-right text-stone-200">{state.lastPassingRung ?? '∅'}</span></div>
      <div>ceiling <span class="float-right text-stone-200">{state.ceilingRung ?? '∅'}</span></div>
      <div>dwell <span class="float-right text-stone-200">{state.dwell.count}{state.dwell.lastDoseDate ? ` @ ${state.dwell.lastDoseDate.slice(5)}` : ''}</span></div>
      <div>pending <span class="float-right text-stone-200">{state.pendingReaction ? `${state.pendingReaction.outcome}` : '∅'}</span></div>
    </div>
    {#if state.pendingReaction}
      <div class="rounded bg-sky-950/40 px-2 py-1 text-[10px] text-sky-200">
        reaction on {state.pendingReaction.rung} · rest until {state.pendingReaction.until} · step back → {state.pendingReaction.stepBackTo}
      </div>
    {/if}
    {#if showReplay}
      <div class="mt-1 rounded bg-stone-950/60 p-1.5 text-[10px] text-stone-400">
        <div class="mb-0.5 text-stone-500">event replay (folded state ⟵ these):</div>
        {#each state.replay as r}
          <div><span class="text-stone-600">{r.date.slice(5)}</span> · {r.detail}</div>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <div class="text-[11px] text-stone-600">no state (ladder inert)</div>
{/if}
