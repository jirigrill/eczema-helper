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
                        <!-- woman: head + flared dress -->
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.6"
                          class="h-[13px] w-[13px]"
                        >
                          <circle cx="12" cy="5" r="3" />
                          <path d="M12 8c-1.6 0-2.7 1-3.1 2.6L7 19h2.2l.8 3h4l.8-3H17l-1.9-8.4C14.7 9 13.6 8 12 8Z" />
                        </svg>
                      {:else}
                        <!-- baby: head + torso in a diaper -->
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.6"
                          class="h-[13px] w-[13px]"
                        >
                          <circle cx="12" cy="5" r="2.5" />
                          <path d="M8 11c0-1.6 1.6-2.7 4-2.7s4 1.1 4 2.7v1.2c0 2-1.8 3.1-4 3.1s-4-1.1-4-3.1V11Z" />
                          <path d="M10 12h4" />
                          <path d="M8 11.3 5.5 13.3" />
                          <path d="M16 11.3 18.5 13.3" />
                          <path d="M10.5 15.4 9.6 18.2" />
                          <path d="M13.5 15.4 14.4 18.2" />
                        </svg>
                      {/if}
                    </span>
                  {/if}
                  {#if row.state.status === 'empty'}
                    <div class="flex flex-1 justify-end"><ActorBody state={row.state} /></div>
                  {:else}
                    <div class="min-w-0 flex-1"><ActorBody state={row.state} /></div>
                  {/if}
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
