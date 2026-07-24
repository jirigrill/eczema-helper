<script lang="ts">
  // PROTOTYPE — settled layout for #557: stacked actor rows. Each eligible
  // actor gets its own always-visible row under a shared slot header, marked
  // by a fixed-width round icon (mother / baby). The exact pictogram is still
  // being chosen against the static prototype's icon-set switcher — this
  // mirrors set 1 (woman figure + baby face). A conflict allergen is shown
  // once per meal section — merged and deduplicated across both actors. Each
  // row's indicator sits in one right rail so an empty actor's "+" lines up
  // under a logged actor's "›" (its meal editor); when BOTH actors are empty
  // the section collapses to a single "+". Collapses to today's single-row
  // look (no icon) when only one actor is eligible this stage.
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
      <a href="/meal?type={slot.type}&date={date}&returnTo=/day/{date}" class="block py-2">
        <div class="flex items-center gap-2">
          <div class="flex flex-1 items-center gap-2 px-0.5 pb-1">
            <Icon class="text-text-muted h-4 w-4" />
            <span class="text-text text-sm font-semibold">{cfg.label}</span>
          </div>
          <span class="flex w-5 shrink-0 justify-center">
            {#if allEmpty}<span class="text-primary text-xl leading-none">+</span>{/if}
          </span>
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
              <div class="flex items-center gap-2 py-1">
                {#if showIcon}
                  <span
                    class="border-surface-dark text-text-muted flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border"
                  >
                    {#if row.actor === 'mother'}
                      <!-- woman: head + flared dress -->
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[18px] w-[18px]">
                        <circle cx="12" cy="5" r="3" />
                        <path d="M12 8c-1.7 0-2.9 1.1-3.3 2.8L6.7 20h2.4l.9 3h4l.9-3h2.4l-1.9-9.2C15 9.1 13.7 8 12 8Z" />
                      </svg>
                    {:else}
                      <!-- baby: face -->
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[18px] w-[18px]">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M9 11h.01" />
                        <path d="M15 11h.01" />
                        <path d="M9.5 15.5c.7.5 1.6.8 2.5.8s1.8-.3 2.5-.8" />
                      </svg>
                    {/if}
                  </span>
                {/if}
                <div class="min-w-0 flex-1">
                  {#if row.state.status === 'logged'}<ActorBody state={row.state} />{/if}
                </div>
                <span class="flex w-5 shrink-0 justify-center">
                  {#if row.state.status === 'empty'}
                    <span class="text-primary text-xl leading-none">+</span>
                  {:else}
                    <span class="text-text-muted text-xl leading-none">›</span>
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </a>
    {/each}
  </div>
</DayCard>
