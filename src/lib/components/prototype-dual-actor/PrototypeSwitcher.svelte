<script lang="ts">
  // PROTOTYPE — switcher for ticket #557's settled layout. Both the layout
  // and the empty-actor-slot treatment are decided; what remains worth
  // toggling is the feeding stage, to see the single-actor collapse case
  // (breastfed → mother only, solids → baby only).
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  const STAGES = ['breastfed', 'mixed', 'solids'] as const;

  let { stage }: { stage: string } = $props();

  function cycleStage(dir: 1 | -1) {
    const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
    const next = STAGES[(idx + dir + STAGES.length) % STAGES.length]!;
    const url = new URL(page.url);
    url.searchParams.set('stage', next);
    goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  }

  function onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))
      return;
    if (e.key === 'ArrowLeft') cycleStage(-1);
    if (e.key === 'ArrowRight') cycleStage(1);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900/90 px-3 py-2 text-white shadow-lg"
>
  <button class="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase" onclick={() => cycleStage(-1)}
    >‹ stage</button
  >
  <span class="min-w-[5rem] text-center text-[11px] font-medium">{stage}</span>
  <button class="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase" onclick={() => cycleStage(1)}
    >stage ›</button
  >
</div>
