<script lang="ts">
  // PROTOTYPE — shared switcher bar for ticket #557's dual-actor slot variants.
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  const VARIANTS = [
    { key: 'A', name: 'Split columns' },
    { key: 'B', name: 'Stacked rows' },
    { key: 'C', name: 'Accordion' },
  ] as const;

  const STAGES = ['breastfed', 'mixed', 'solids'] as const;

  let { variant, stage }: { variant: string; stage: string } = $props();

  function setParam(key: string, value: string) {
    const url = new URL(page.url);
    url.searchParams.set(key, value);
    goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  }

  function cycleVariant(dir: 1 | -1) {
    const idx = VARIANTS.findIndex((v) => v.key === variant);
    const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length]!;
    setParam('variant', next.key);
  }

  function cycleStage(dir: 1 | -1) {
    const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
    const next = STAGES[(idx + dir + STAGES.length) % STAGES.length]!;
    setParam('stage', next);
  }

  function onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))
      return;
    if (e.key === 'ArrowLeft') cycleVariant(-1);
    if (e.key === 'ArrowRight') cycleVariant(1);
  }

  const currentName = $derived(VARIANTS.find((v) => v.key === variant)?.name ?? variant);
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900/90 px-3 py-2 text-white shadow-lg"
>
  <button aria-label="Previous variant" class="px-1 text-lg leading-none" onclick={() => cycleVariant(-1)}
    >‹</button
  >
  <span class="min-w-[9rem] text-center text-xs font-semibold">{variant} — {currentName}</span>
  <button aria-label="Next variant" class="px-1 text-lg leading-none" onclick={() => cycleVariant(1)}>›</button
  >
  <span class="mx-1 h-4 w-px bg-white/30"></span>
  <button class="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase" onclick={() => cycleStage(-1)}
    >‹ stage</button
  >
  <span class="min-w-[5rem] text-center text-[11px] font-medium">{stage}</span>
  <button class="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase" onclick={() => cycleStage(1)}
    >stage ›</button
  >
</div>
