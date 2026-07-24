<script lang="ts">
  // PROTOTYPE — switcher for ticket #557's winning layout (was "Variant B").
  // The layout question is settled; what's left is the empty-actor-slot
  // treatment, so this cycles `?empty=1-4` (and `?stage=` for the
  // single-actor collapse case) instead of a layout letter.
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  const EMPTY_STYLES = [
    { key: '1', name: '"+ Zapsat" link' },
    { key: '2', name: '"Nezapsáno" muted' },
    { key: '3', name: 'Dashed CTA pill' },
    { key: '4', name: '"+" icon only' },
  ] as const;

  const STAGES = ['breastfed', 'mixed', 'solids'] as const;

  let { empty, stage }: { empty: string; stage: string } = $props();

  function setParam(key: string, value: string) {
    const url = new URL(page.url);
    url.searchParams.set(key, value);
    goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  }

  function cycleEmpty(dir: 1 | -1) {
    const idx = EMPTY_STYLES.findIndex((v) => v.key === empty);
    const next = EMPTY_STYLES[(idx + dir + EMPTY_STYLES.length) % EMPTY_STYLES.length]!;
    setParam('empty', next.key);
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
    if (e.key === 'ArrowLeft') cycleEmpty(-1);
    if (e.key === 'ArrowRight') cycleEmpty(1);
  }

  const currentName = $derived(EMPTY_STYLES.find((v) => v.key === empty)?.name ?? empty);
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900/90 px-3 py-2 text-white shadow-lg"
>
  <button aria-label="Previous empty-state option" class="px-1 text-lg leading-none" onclick={() => cycleEmpty(-1)}
    >‹</button
  >
  <span class="min-w-[11rem] text-center text-xs font-semibold">{empty} — {currentName}</span>
  <button aria-label="Next empty-state option" class="px-1 text-lg leading-none" onclick={() => cycleEmpty(1)}
    >›</button
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
