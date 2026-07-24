<script lang="ts">
  // PROTOTYPE — settled layout for #557: stacked actor rows. Each eligible
  // actor gets its own always-visible row under a shared slot header, tagged
  // "Já"/"Miminko". A conflict allergen is shown once per meal section —
  // merged and deduplicated across both actors — rather than per actor row.
  // An empty actor slot renders a single "+". A single "›" arrow is centered
  // vertically against the whole section (one tap target into the meal
  // editor), not one arrow per row. Collapses to today's single-row look —
  // no tag, no header split — when only one actor is eligible this stage.
  import { mealConfig } from '$lib/config/meals';
  import { categoryStrings } from '$lib/strings/categories';
  import { commonStrings } from '$lib/strings/common';
  import DayCard from '../DayCard.svelte';
  import ActorBody from './ActorBody.svelte';
  import type { ActorState, DualSlot } from './mock-data';

  let { date, slots }: { date: string; slots: DualSlot[] } = $props();

  function actorRows(slot: DualSlot): { actor: 'mother' | 'baby'; label: string; state: ActorState }[] {
    const rows: { actor: 'mother' | 'baby'; label: string; state: ActorState }[] = [];
    if (slot.mother.status !== 'not-eligible') rows.push({ actor: 'mother', label: 'Já', state: slot.mother });
    if (slot.baby.status !== 'not-eligible') rows.push({ actor: 'baby', label: 'Miminko', state: slot.baby });
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
      {@const showTag = rows.length > 1}
      {@const conflictAllergens = mergedConflictAllergens(rows)}
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
          <div class="pl-6">
            {#each rows as row (row.actor)}
              <div class="flex items-start gap-2 py-1">
                {#if showTag}
                  <span
                    class="border-surface-dark text-text-muted mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                    >{row.label}</span
                  >
                {/if}
                <div class="min-w-0 flex-1"><ActorBody state={row.state} /></div>
              </div>
            {/each}
          </div>
        </div>
        <span class="text-text-muted shrink-0 text-xl">›</span>
      </a>
    {/each}
  </div>
</DayCard>
