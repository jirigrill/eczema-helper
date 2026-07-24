<script lang="ts">
  // PROTOTYPE — Variant F: accordion, spaced. Identical interaction to
  // Variant C, but the two expanded groups get generous vertical space and
  // a light divider between them instead of sitting close together, so
  // "Matka" and "Dítě" read as clearly separate groups rather than a tight
  // stacked list.
  import { mealConfig } from '$lib/config/meals';
  import { commonStrings } from '$lib/strings/common';
  import DayCard from '../DayCard.svelte';
  import ActorBody from './ActorBody.svelte';
  import type { ActorState, DualSlot } from './mock-data';

  let { date, slots }: { date: string; slots: DualSlot[] } = $props();

  let openSlots = $state(new Set<string>());
  function toggle(type: string) {
    const next = new Set(openSlots);
    next.has(type) ? next.delete(type) : next.add(type);
    openSlots = next;
  }

  function summaryFor(label: string, state: ActorState): string {
    if (state.status === 'logged') return `${label}: ${state.render.items.map((i) => i.name).join(', ')}`;
    if (state.status === 'empty') return `${label}: —`;
    return '';
  }

  function hasConflict(state: ActorState): boolean {
    return state.status === 'logged' && state.render.conflictAllergens.length > 0;
  }
</script>

<DayCard label={commonStrings.today.mealsLabel}>
  <div class="divide-surface-dark divide-y">
    {#each slots as slot (slot.type)}
      {@const cfg = mealConfig[slot.type]}
      {@const Icon = cfg.icon}
      {@const bothEligible = slot.mother.status !== 'not-eligible' && slot.baby.status !== 'not-eligible'}
      {@const isOpen = openSlots.has(slot.type)}
      {@const anyConflict = hasConflict(slot.mother) || hasConflict(slot.baby)}
      <div class="py-2">
        <button
          class="flex w-full items-center gap-3 text-left"
          onclick={() => (bothEligible ? toggle(slot.type) : undefined)}
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {anyConflict
              ? 'bg-danger/15 text-danger'
              : 'text-primary bg-white'}"
          >
            <Icon class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-text text-sm font-semibold">{cfg.label}</div>
            {#if bothEligible && !isOpen}
              <div class="text-text-muted text-[11px]">
                {summaryFor('Matka', slot.mother)} · {summaryFor('Dítě', slot.baby)}
              </div>
            {:else if !bothEligible && slot.mother.status === 'logged'}
              <div class="text-text-muted text-[11px]">
                {slot.mother.render.items.map((i) => i.name).join(' · ')}
              </div>
            {:else if !bothEligible && slot.baby.status === 'logged'}
              <div class="text-text-muted text-[11px]">
                {slot.baby.render.items.map((i) => i.name).join(' · ')}
              </div>
            {/if}
          </div>
          <span class="text-text-muted text-sm">{bothEligible ? (isOpen ? '⌄' : '›') : '›'}</span>
        </button>

        {#if bothEligible && isOpen}
          <div class="mt-3 pl-12">
            <a
              href="/meal?type={slot.type}&date={date}&actor=mother&returnTo=/day/{date}"
              class="flex items-start gap-2"
            >
              <span
                class="border-surface-dark text-text-muted mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                >Matka</span
              >
              <div class="min-w-0 flex-1"><ActorBody state={slot.mother} /></div>
            </a>
            <div class="border-surface-dark my-4 border-t"></div>
            <a
              href="/meal?type={slot.type}&date={date}&actor=baby&returnTo=/day/{date}"
              class="flex items-start gap-2"
            >
              <span
                class="border-surface-dark text-text-muted mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                >Dítě</span
              >
              <div class="min-w-0 flex-1"><ActorBody state={slot.baby} /></div>
            </a>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</DayCard>
