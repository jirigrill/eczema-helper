<script lang="ts">
  // PROTOTYPE — settled layout for #557: stacked actor rows. Each eligible
  // actor gets its own always-visible row under a shared slot header, marked
  // by a fixed-width round icon (mother / baby, like the meal-type icons) so
  // the rows stay aligned. A conflict allergen is shown once per meal section
  // — merged and deduplicated across both actors — rather than per actor row.
  // An empty actor row is a single "+"; when BOTH actors are empty the whole
  // section collapses to one "+" where the arrow would be. Otherwise a single
  // "›", centered against the section, is the tap target into the meal
  // editor. Collapses to today's single-row look (no icon) when only one
  // actor is eligible this stage.
  import { mealConfig } from '$lib/config/meals';
  import { categoryStrings } from '$lib/strings/categories';
  import { commonStrings } from '$lib/strings/common';
  import DayCard from '../DayCard.svelte';
  import ActorBody from './ActorBody.svelte';
  import type { ActorState, DualSlot } from './mock-data';

  let { date, slots }: { date: string; slots: DualSlot[] } = $props();

  function actorRows(slot: DualSlot): { actor: 'mother' | 'baby'; state: ActorState }[] {
    const rows: { actor: 'mother' | 'baby'; state: ActorState }[] = [];
    if (slot.mother.status !== 'not-eligible') rows.push({ actor: 'mother', state: slot.mother });
    if (slot.baby.status !== 'not-eligible') rows.push({ actor: 'baby', state: slot.baby });
    return rows;
  }

  function mergedConflictAllergens(rows: { state: ActorState }[]): string[] {
    const merged = new Set<string>();
    for (const row of rows) {
      if (row.state.status === 'logged') for (const a of row.state.render.conflictAllergens) merged.add(a);
    }
    return [...merged];
  }
</script>

<DayCard label={commonStrings.today.mealsLabel}>
  <div class="divide-surface-dark divide-y">
    {#each slots as slot (slot.type)}
      {@const cfg = mealConfig[slot.type]}
      {@const Icon = cfg.icon}
      {@const rows = actorRows(slot)}
      {@const showIcon = rows.length > 1}
      {@const conflictAllergens = mergedConflictAllergens(rows)}
      {@const allEmpty = rows.every((r) => r.state.status === 'empty')}
      <a
        href="/meal?type={slot.type}&date={date}&returnTo=/day/{date}"
        class="flex items-center gap-2 py-2"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 px-0.5 pb-1">
            <Icon class="text-text-muted h-4 w-4" />
            <span class="text-text text-sm font-semibold">{cfg.label}</span>
          </div>
          {#if conflictAllergens.length > 0}
            <div class="mb-1 flex flex-wrap gap-1 pl-6">
              {#each conflictAllergens as a}
                <span class="bg-danger/15 text-danger rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  >⚠ {categoryStrings[a as keyof typeof categoryStrings]?.name ?? a}</span
                >
              {/each}
            </div>
          {/if}
          {#if !allEmpty}
            <div class="pl-6">
              {#each rows as row (row.actor)}
                <div class="flex items-start gap-2 py-1">
                  {#if showIcon}
                    <span
                      class="border-surface-dark text-text-muted flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border"
                    >
                      {#if row.actor === 'mother'}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.6"
                          class="h-[13px] w-[13px]"
                        >
                          <circle cx="12" cy="8" r="4" />
                          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
                        </svg>
                      {:else}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.6"
                          class="h-[13px] w-[13px]"
                        >
                          <path d="M9 12h.01" />
                          <path d="M15 12h.01" />
                          <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
                          <path d="M17 5c.5.6.8 1.4.8 2.2 0 .8-.3 1.6-.8 2.2" />
                          <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-3-6.7" />
                        </svg>
                      {/if}
                    </span>
                  {/if}
                  <div class="min-w-0 flex-1"><ActorBody state={row.state} /></div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        {#if allEmpty}
          <span class="text-primary shrink-0 text-xl leading-none">+</span>
        {:else}
          <span class="text-text-muted shrink-0 text-xl">›</span>
        {/if}
      </a>
    {/each}
  </div>
</DayCard>
