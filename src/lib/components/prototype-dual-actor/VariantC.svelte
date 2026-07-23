<script lang="ts">
  // PROTOTYPE — Variant C: accordion. When both actors are eligible, the slot
  // stays a single collapsed summary row ("Matka: ... · Dítě: ...") until
  // tapped open, then reveals two full rows. When only one actor is
  // eligible this stage there is nothing to disclose, so it degrades to
  // today's exact single-row MealCard look, chevron included — no accordion.
  import { mealConfig } from '$lib/config/meals';
  import { categoryStrings } from '$lib/strings/categories';
  import { commonStrings } from '$lib/strings/common';
  import DayCard from '../DayCard.svelte';
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
            {#if bothEligible}
              <div class="text-text-muted truncate text-[11px]">
                {summaryFor('Matka', slot.mother)} · {summaryFor('Dítě', slot.baby)}
              </div>
            {:else if slot.mother.status === 'logged'}
              <div class="text-text-muted truncate text-[11px]">
                {slot.mother.render.items.map((i) => i.name).join(' · ')}
              </div>
            {:else if slot.baby.status === 'logged'}
              <div class="text-text-muted truncate text-[11px]">
                {slot.baby.render.items.map((i) => i.name).join(' · ')}
              </div>
            {/if}
          </div>
          <span class="text-text-muted text-sm">{bothEligible ? (isOpen ? '⌄' : '›') : '›'}</span>
        </button>

        {#if bothEligible && isOpen}
          <div class="mt-1.5 space-y-1.5 pl-12">
            {#each [{ actor: 'mother', label: 'Matka', state: slot.mother }, { actor: 'baby', label: 'Dítě', state: slot.baby }] as row (row.actor)}
              <a
                href="/meal?type={slot.type}&date={date}&actor={row.actor}&returnTo=/day/{date}"
                class="flex items-start gap-2"
              >
                <span
                  class="border-surface-dark text-text-muted mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                  >{row.label}</span
                >
                <div class="min-w-0 flex-1">
                  {#if row.state.status === 'logged'}
                    {@const r = row.state.render}
                    <div class="flex flex-wrap items-center gap-1">
                      {#each r.conflictAllergens as a}
                        <span class="bg-danger/15 text-danger rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          >⚠ {categoryStrings[a as keyof typeof categoryStrings]?.name ?? a}</span
                        >
                      {/each}
                    </div>
                    <div class="text-text-muted truncate text-[11px]">
                      {#each r.items as item, i}
                        {#if i > 0}<span> · </span>{/if}<span
                          class={item.conflict ? 'text-danger font-medium' : ''}>{item.name}</span
                        >
                      {/each}
                    </div>
                  {:else}
                    <div class="text-primary text-[11px]">+ Zapsat</div>
                  {/if}
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</DayCard>
