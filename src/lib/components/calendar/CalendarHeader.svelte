<script lang="ts">
  import { formatMonthYear } from '$lib/utils/calendar';

  let {
    year,
    month,
    onPrev,
    onNext,
    onToday,
  }: {
    year: number;
    month: number;
    onPrev: () => void;
    onNext: () => void;
    onToday?: () => void;
  } = $props();

  const monthYearText = $derived(formatMonthYear(year, month));
</script>

<div class="flex items-center justify-between px-2 py-1">
  <button
    type="button"
    onclick={onPrev}
    class="p-2 rounded-lg hover:bg-surface"
    aria-label="Předchozí měsíc"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  </button>

  <button
    type="button"
    onclick={onToday}
    class="text-sm font-semibold text-text"
  >
    {monthYearText}
  </button>

  <button
    type="button"
    onclick={onNext}
    class="p-2 rounded-lg hover:bg-surface"
    aria-label="Další měsíc"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div>
