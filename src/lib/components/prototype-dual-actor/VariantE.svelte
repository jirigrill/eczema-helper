<script lang="ts">
  // PROTOTYPE — Variant E: actor tabs. A segmented control above the whole
  // meal list switches between "Matka" and "Dítě" full slot lists (each
  // identical in shape to today's single-actor MealCard). Never combines
  // both actors in one row, so there's nothing to squeeze — and the tab bar
  // itself disappears when only one actor is eligible this stage (the
  // collapse case), leaving exactly today's MealCard.
  import { mealConfig } from '$lib/config/meals';
  import { commonStrings } from '$lib/strings/common';
  import DayCard from '../DayCard.svelte';
  import ActorBody from './ActorBody.svelte';
  import type { DualSlot } from './mock-data';

  let { date, slots }: { date: string; slots: DualSlot[] } = $props();

  let selectedActor = $state<'mother' | 'baby'>('mother');

  const motherEligible = $derived(slots.some((s) => s.mother.status !== 'not-eligible'));
  const babyEligible = $derived(slots.some((s) => s.baby.status !== 'not-eligible'));
  const showTabs = $derived(motherEligible && babyEligible);
  const effectiveActor = $derived(
    (selectedActor === 'mother' && !motherEligible) ? 'baby'
    : (selectedActor === 'baby' && !babyEligible) ? 'mother'
    : selectedActor,
  );
</script>

<DayCard label={commonStrings.today.mealsLabel}>
  {#if showTabs}
    <div class="mb-2.5 flex gap-1.5">
      <button
        class="flex-1 rounded-full py-1.5 text-xs font-semibold {effectiveActor === 'mother'
          ? 'bg-primary text-white'
          : 'bg-surface-dark text-text-muted'}"
        onclick={() => (selectedActor = 'mother')}>Matka</button
      >
      <button
        class="flex-1 rounded-full py-1.5 text-xs font-semibold {effectiveActor === 'baby'
          ? 'bg-primary text-white'
          : 'bg-surface-dark text-text-muted'}"
        onclick={() => (selectedActor = 'baby')}>Dítě</button
      >
    </div>
  {/if}
  <div class="divide-surface-dark divide-y">
    {#each slots as slot (slot.type)}
      {@const cfg = mealConfig[slot.type]}
      {@const Icon = cfg.icon}
      {@const state = effectiveActor === 'mother' ? slot.mother : slot.baby}
      {@const isConflict = state.status === 'logged' && state.render.conflictAllergens.length > 0}
      <a
        href="/meal?type={slot.type}&date={date}&actor={effectiveActor}&returnTo=/day/{date}"
        class="flex items-start gap-3 py-2"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {isConflict
            ? 'bg-danger/15 text-danger'
            : 'text-primary bg-white'}"
        >
          <Icon class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-text mb-1 text-sm font-semibold">{cfg.label}</div>
          <ActorBody {state} />
        </div>
      </a>
    {/each}
  </div>
</DayCard>
