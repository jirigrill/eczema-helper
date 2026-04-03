<script lang="ts">
  import type { DayInfo } from '$lib/utils/calendar';

  let {
    day,
    hasEliminations = false,
    hasReintroductions = false,
    inspected = false,
    inRange = false,
    isEndpoint = false,
    accentBg = 'bg-primary',
    accentBgLight = 'bg-primary/15',
    accentText = 'text-primary',
    onSelect,
  }: {
    day: DayInfo;
    hasEliminations?: boolean;
    hasReintroductions?: boolean;
    inspected?: boolean;
    inRange?: boolean;
    isEndpoint?: boolean;
    accentBg?: string;
    accentBgLight?: string;
    accentText?: string;
    onSelect: (date: string) => void;
  } = $props();
</script>

<button
  type="button"
  class="
    relative flex flex-col items-center justify-center
    h-10 w-full transition-colors
    {day.isCurrentMonth ? '' : 'opacity-30'}
    {isEndpoint
      ? `${accentBg} text-white font-bold rounded-lg`
      : inRange
        ? `${accentBgLight} ${accentText} font-medium`
        : inspected
          ? 'bg-primary/20 text-primary font-semibold rounded-lg ring-2 ring-primary/30'
          : day.isToday
            ? 'text-primary font-bold'
            : 'text-text'}
  "
  onclick={() => onSelect(day.date)}
>
  <span class="text-xs leading-none">{day.dayNumber}</span>
  {#if day.isCurrentMonth && (hasEliminations || hasReintroductions)}
    <div class="absolute bottom-1 flex h-[2px] w-3 rounded-full overflow-hidden">
      {#if hasEliminations && hasReintroductions}
        <span class="flex-1 {isEndpoint ? 'bg-white/70' : 'bg-primary'}"></span>
        <span class="flex-1 {isEndpoint ? 'bg-white/50' : 'bg-[#4A7C6F]'}"></span>
      {:else if hasEliminations}
        <span class="flex-1 {isEndpoint ? 'bg-white/70' : 'bg-primary'}"></span>
      {:else}
        <span class="flex-1 {isEndpoint ? 'bg-white/50' : 'bg-[#4A7C6F]'}"></span>
      {/if}
    </div>
  {/if}
</button>
