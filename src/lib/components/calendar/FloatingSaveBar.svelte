<script lang="ts">
  import { formatDateShort } from '$lib/utils/calendar';
  import { cs } from '$lib/i18n/cs';

  let {
    rangeStart,
    rangeEnd,
    sortedRange,
    rangeDayCount,
    isReintroMode,
    onSave,
  }: {
    rangeStart: string | null;
    rangeEnd: string | null;
    sortedRange: { start: string; end: string } | null;
    rangeDayCount: number;
    isReintroMode: boolean;
    onSave: () => void;
  } = $props();

  function dayPlural(n: number): string {
    if (n === 1) return 'den';
    if (n >= 2 && n <= 4) return 'dny';
    return 'dní';
  }
</script>

<div class="fixed left-0 right-0 z-40 px-3 pb-1" style="bottom: calc(3.5rem + var(--safe-area-inset-bottom));">
  <div class="rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 border bg-white
    {isReintroMode ? 'border-[#4A7C6F]/30' : 'border-primary/30'}">
    <div class="flex-1 text-xs text-text-muted min-w-0">
      {#if sortedRange && rangeEnd}
        <span class="font-medium text-text">{formatDateShort(sortedRange.start)} – {formatDateShort(sortedRange.end)}</span>
        <span class="ml-1">({rangeDayCount} {dayPlural(rangeDayCount)})</span>
      {:else if rangeStart}
        <span class="font-medium text-text">{formatDateShort(rangeStart)}</span>
        <span class="ml-1">{cs.selectEndSuffix}</span>
      {:else}
        <span>{cs.selectPeriod}</span>
      {/if}
    </div>
    <button
      type="button"
      class="flex-none text-white text-sm font-medium rounded-lg px-5 py-2 min-h-[44px] transition-all
        {isReintroMode ? 'bg-[#4A7C6F]' : 'bg-primary'}
        {rangeStart ? '' : 'opacity-40 pointer-events-none'}"
      onclick={onSave}
      disabled={!rangeStart}
    >
      {cs.save}
    </button>
  </div>
</div>
