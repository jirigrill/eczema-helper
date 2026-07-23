<script lang="ts">
  // PROTOTYPE — Variant B: stacked actor rows. Each eligible actor gets its
  // own always-visible row under a shared slot header, tagged with a small
  // "Matka"/"Dítě" chip. Collapses to today's exact single-row look — no
  // chip, no header split — when only one actor is eligible this stage.
  import { mealConfig } from '$lib/config/meals';
  import { categoryStrings } from '$lib/strings/categories';
  import { commonStrings } from '$lib/strings/common';
  import DayCard from '../DayCard.svelte';
  import type { ActorState, DualSlot } from './mock-data';

  let { date, slots }: { date: string; slots: DualSlot[] } = $props();

  function actorRows(slot: DualSlot): { actor: 'mother' | 'baby'; label: string; state: ActorState }[] {
    const rows: { actor: 'mother' | 'baby'; label: string; state: ActorState }[] = [];
    if (slot.mother.status !== 'not-eligible') rows.push({ actor: 'mother', label: 'Matka', state: slot.mother });
    if (slot.baby.status !== 'not-eligible') rows.push({ actor: 'baby', label: 'Dítě', state: slot.baby });
    return rows;
  }
</script>

<DayCard label={commonStrings.today.mealsLabel}>
  <div class="divide-surface-dark divide-y">
    {#each slots as slot (slot.type)}
      {@const cfg = mealConfig[slot.type]}
      {@const Icon = cfg.icon}
      {@const rows = actorRows(slot)}
      {@const showTag = rows.length > 1}
      <div class="py-2">
        <div class="flex items-center gap-2 px-0.5 pb-1">
          <Icon class="text-text-muted h-4 w-4" />
          <span class="text-text text-sm font-semibold">{cfg.label}</span>
        </div>
        {#each rows as row (row.actor)}
          <a
            href="/meal?type={slot.type}&date={date}&actor={row.actor}&returnTo=/day/{date}"
            class="flex items-start gap-2 py-1 pl-6"
          >
            {#if showTag}
              <span
                class="border-surface-dark text-text-muted mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                >{row.label}</span
              >
            {/if}
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
                    {#if i > 0}<span> · </span>{/if}<span class={item.conflict ? 'text-danger font-medium' : ''}
                      >{item.name}</span
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
    {/each}
  </div>
</DayCard>
