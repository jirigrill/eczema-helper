<script lang="ts">
  // PROTOTYPE — Variant A: split columns. Each slot row divides in two when
  // both actors are eligible (grid-cols-2 divide-x — same primitive the day
  // view already uses for "Smím / Vyhýbej se"). Collapses to a single
  // full-width column, identical to today's MealCard row, when only one
  // actor is eligible for the current feeding stage.
  import { mealConfig } from '$lib/config/meals';
  import { commonStrings } from '$lib/strings/common';
  import DayCard from '../DayCard.svelte';
  import ActorBody from './ActorBody.svelte';
  import type { DualSlot } from './mock-data';

  let { date, slots }: { date: string; slots: DualSlot[] } = $props();
</script>

<DayCard label={commonStrings.today.mealsLabel}>
  <div class="divide-surface-dark divide-y">
    {#each slots as slot (slot.type)}
      {@const cfg = mealConfig[slot.type]}
      {@const Icon = cfg.icon}
      {@const bothEligible = slot.mother.status !== 'not-eligible' && slot.baby.status !== 'not-eligible'}
      <div class="py-2">
        <div class="mb-1 flex items-center gap-2 px-0.5">
          <Icon class="text-text-muted h-4 w-4" />
          <span class="text-text text-sm font-semibold">{cfg.label}</span>
        </div>
        <div class={bothEligible ? 'grid grid-cols-2' : ''}>
          {#if slot.mother.status !== 'not-eligible'}
            <a
              href="/meal?type={slot.type}&date={date}&actor=mother&returnTo=/day/{date}"
              class="block {bothEligible ? 'border-surface-dark border-r pr-2' : ''}"
            >
              {#if bothEligible}
                <div class="text-text-muted mb-1 text-[9px] font-bold tracking-wide uppercase">Matka</div>
              {/if}
              <ActorBody state={slot.mother} />
            </a>
          {/if}
          {#if slot.baby.status !== 'not-eligible'}
            <a
              href="/meal?type={slot.type}&date={date}&actor=baby&returnTo=/day/{date}"
              class="block {bothEligible ? 'pl-2' : ''}"
            >
              {#if bothEligible}
                <div class="text-text-muted mb-1 text-[9px] font-bold tracking-wide uppercase">Dítě</div>
              {/if}
              <ActorBody state={slot.baby} />
            </a>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</DayCard>
