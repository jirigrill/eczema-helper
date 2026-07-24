<script lang="ts">
  // PROTOTYPE — Variant D: twin cards. Each eligible actor gets its own
  // bordered card, stacked full-width, with generous room for the item
  // list to wrap. Collapses to a plain borderless row (today's exact look)
  // when only one actor is eligible this stage.
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
        <div class="mb-1.5 flex items-center gap-2 px-0.5">
          <Icon class="text-text-muted h-4 w-4" />
          <span class="text-text text-sm font-semibold">{cfg.label}</span>
        </div>
        <div class={bothEligible ? 'flex flex-col gap-2' : ''}>
          {#if slot.mother.status !== 'not-eligible'}
            {#if bothEligible}
              <a
                href="/meal?type={slot.type}&date={date}&actor=mother&returnTo=/day/{date}"
                class="border-surface-dark bg-surface block rounded-xl border px-2.5 py-2"
              >
                <div class="text-text-muted mb-1 text-[9px] font-bold tracking-wide uppercase">Matka</div>
                <ActorBody state={slot.mother} />
              </a>
            {:else}
              <a href="/meal?type={slot.type}&date={date}&actor=mother&returnTo=/day/{date}" class="block">
                <ActorBody state={slot.mother} />
              </a>
            {/if}
          {/if}
          {#if slot.baby.status !== 'not-eligible'}
            {#if bothEligible}
              <a
                href="/meal?type={slot.type}&date={date}&actor=baby&returnTo=/day/{date}"
                class="border-surface-dark bg-surface block rounded-xl border px-2.5 py-2"
              >
                <div class="text-text-muted mb-1 text-[9px] font-bold tracking-wide uppercase">Dítě</div>
                <ActorBody state={slot.baby} />
              </a>
            {:else}
              <a href="/meal?type={slot.type}&date={date}&actor=baby&returnTo=/day/{date}" class="block">
                <ActorBody state={slot.baby} />
              </a>
            {/if}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</DayCard>
