<script lang="ts">
  import { getMonthDays, getWeekdayNames } from '$lib/utils/calendar';
  import DayCell from './DayCell.svelte';
  import type { FoodLog } from '$lib/domain/models';
  import {
    dateHasEliminations,
    dateHasReintroductions,
  } from '$lib/domain/services/food-tracking.service';

  let {
    year,
    month,
    foodLogs = [],
    inspectedDate = null,
    mode = 'view',
    accentBg = 'bg-primary',
    accentBgLight = 'bg-primary/15',
    accentText = 'text-primary',
    isInRange = () => false,
    isRangeEndpoint = () => false,
    onSelectDate,
  }: {
    year: number;
    month: number;
    foodLogs?: FoodLog[];
    inspectedDate?: string | null;
    mode?: 'view' | 'edit';
    accentBg?: string;
    accentBgLight?: string;
    accentText?: string;
    isInRange?: (date: string) => boolean;
    isRangeEndpoint?: (date: string) => boolean;
    onSelectDate: (date: string) => void;
  } = $props();

  const days = $derived(getMonthDays(year, month));
  const weekdayNames = getWeekdayNames();
</script>

<div class="px-2">
  <div class="grid grid-cols-7">
    {#each weekdayNames as name}
      <div class="text-center text-[10px] text-text-muted font-medium py-0.5">{name}</div>
    {/each}
  </div>

  <div class="grid grid-cols-7 gap-px">
    {#each days as day (day.date)}
      <DayCell
        {day}
        hasEliminations={dateHasEliminations(foodLogs, day.date)}
        hasReintroductions={dateHasReintroductions(foodLogs, day.date)}
        inspected={mode === 'view' && inspectedDate === day.date}
        inRange={mode === 'edit' && isInRange(day.date)}
        isEndpoint={mode === 'edit' && isRangeEndpoint(day.date)}
        {accentBg}
        {accentBgLight}
        {accentText}
        onSelect={onSelectDate}
      />
    {/each}
  </div>
</div>
