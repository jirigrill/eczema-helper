<script lang="ts">
  // PROTOTYPE — settled layout for #557: stacked actor rows. Each eligible
  // actor gets its own always-visible row under a shared slot header, marked
  // by a fixed-width round icon: a woman (side ponytail) for the mother, a
  // seated baby in a diaper for the child. A conflict allergen is shown
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
                    class="border-surface-dark text-text-muted flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full border"
                  >
                    {#if row.actor === 'mother'}
                      <!-- woman avatar: head + side ponytail + bangs + shoulders -->
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="h-[20px] w-[20px]"
                      >
                        <path d="M8.6 7.4c0-2.6 1.5-4.4 3.4-4.4s3.4 1.8 3.4 4.4c0 2.2-1.5 3.8-3.4 3.8s-3.4-1.6-3.4-3.8Z" />
                        <path d="M8.9 5.8c.6-1.7 1.8-2.8 3.1-2.8s2.5 1.1 3.1 2.8" />
                        <path d="M8.7 5.4C6.9 5.6 5.8 6.9 6 8.4c.1.9.7 1.5 1.6 1.6" />
                        <path d="M12 11.2v1.3" />
                        <path d="M7 21v-2.7c0-2.3 1.7-4.1 3.8-4.4" />
                        <path d="M17 21v-2.7c0-2.3-1.7-4.1-3.8-4.4" />
                        <path d="M10.2 13.9a5 5 0 0 1 3.6 0" />
                      </svg>
                    {:else}
                      <!-- seated baby in a diaper: curl, happy face, folded legs -->
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="h-[20px] w-[20px]"
                      >
                        <circle cx="12" cy="6.4" r="4" />
                        <path d="M11.4 2.6c1.5-.2 2.5 1 1.9 2.2-.3.6-.9.8-1.5.6" />
                        <circle cx="10.2" cy="6.3" r=".85" fill="currentColor" stroke="none" />
                        <circle cx="13.8" cy="6.3" r=".85" fill="currentColor" stroke="none" />
                        <path d="M10.6 8c.4.4.9.6 1.4.6s1-.2 1.4-.6" />
                        <path d="M8.7 11c-1.7.9-2.8 2.6-2.8 4.6 0 1 .7 1.9 1.7 2.1" />
                        <path d="M15.3 11c1.7.9 2.8 2.6 2.8 4.6 0 1-.7 1.9-1.7 2.1" />
                        <path d="M9.8 15.4h4.4l-2.2 3Z" />
                        <path d="M6.9 17.7c-.7.5-1.6.1-1.6-.8" />
                        <path d="M17.1 17.7c.7.5 1.6.1 1.6-.8" />
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
