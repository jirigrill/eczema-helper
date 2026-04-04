<script lang="ts">
  import { childrenStore } from '$lib/stores/children.svelte';
  import { foodLogStore } from '$lib/stores/food-log.svelte';
  import { getTodayIso, formatDateLong } from '$lib/utils/calendar';
  import {
    getExactDateEliminatedDetails,
    getExactDateReintroducedDetails,
  } from '$lib/domain/services/food-tracking.service';
  import type { FoodCategory } from '$lib/domain/models';
  import { onMount } from 'svelte';
  import { cs } from '$lib/i18n/cs';

  let categories = $state<FoodCategory[]>([]);
  const activeChildId = $derived(childrenStore.activeChildId);
  const foodLogs = $derived(foodLogStore.logs);
  const todayIso = getTodayIso();

  const eliminated = $derived(getExactDateEliminatedDetails(foodLogs, todayIso, categories));
  const reintroduced = $derived(getExactDateReintroducedDetails(foodLogs, todayIso, categories));

  onMount(async () => {
    try {
      const res = await fetch('/api/food-categories');
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          categories = json.data;
        }
      }
    } catch {
      // Will show empty state
    }
  });

  $effect(() => {
    if (activeChildId) {
      foodLogStore.loadForDateRange(activeChildId, todayIso, todayIso);
    }
  });
</script>

{#if !activeChildId}
  <div class="flex-1 flex items-center justify-center p-8 text-center">
    <div>
      <p class="text-lg text-text-muted mb-2">{cs.addChildFirst}</p>
      <a href="/settings" class="text-primary underline">{cs.goToSettings}</a>
    </div>
  </div>
{:else}
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-lg font-semibold text-text">{cs.today}</h1>
        <p class="text-sm text-text-muted">{formatDateLong(todayIso)}</p>
      </div>
      <a
        href="/calendar"
        class="text-sm text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
      >
        {cs.editInCalendar}
      </a>
    </div>

    {#if categories.length === 0}
      <div class="text-center text-text-muted py-8">{cs.loadingCategories}</div>
    {:else if eliminated.length === 0 && reintroduced.length === 0}
      <div class="bg-white rounded-xl border border-surface-dark p-6 text-center">
        <p class="text-text-muted">{cs.noEliminationsToday}</p>
      </div>
    {:else}
      <div class="bg-white rounded-xl border border-surface-dark overflow-hidden">
        {#if eliminated.length > 0}
          <div class="px-4 pt-3 pb-2">
            <p class="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1.5">{cs.eliminated}</p>
            <div class="space-y-0.5">
              {#each eliminated as entry (entry.category.id)}
                <div class="flex items-center gap-2 py-1">
                  <span class="text-base">{entry.category.icon}</span>
                  <div>
                    <span class="text-sm text-text">{entry.category.nameCs}</span>
                    {#if entry.items.length > 0}
                      <span class="text-xs text-text-muted ml-1">({entry.items.map(i => i.nameCs).join(', ')})</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if reintroduced.length > 0}
          <div class="px-4 pb-3 {eliminated.length > 0 ? 'pt-2 border-t border-surface-dark mt-2' : 'pt-3'}">
            <p class="text-[10px] uppercase tracking-wider text-reintro-accent font-semibold mb-1.5">{cs.reintroduced}</p>
            <div class="space-y-0.5">
              {#each reintroduced as entry (entry.category.id)}
                <div class="flex items-center gap-2 py-1">
                  <span class="text-base">{entry.category.icon}</span>
                  <div>
                    <span class="text-sm text-text">{entry.category.nameCs}</span>
                    {#if entry.items.length > 0}
                      <span class="text-xs text-text-muted ml-1">({entry.items.map(i => i.nameCs).join(', ')})</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
