<script lang="ts">
  import type { Component } from 'svelte';

  import type { Actor, Meal, MealItem } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { mealConfig } from '$lib/config/meals';
  import { actorConfig } from '$lib/config/actors';
  import DayCard from './DayCard.svelte';

  let {
    date,
    meals,
    eligibleActors,
  }: {
    date: string;
    meals: Meal[];
    /** Actors who may log at the current feeding stage (`getEligibleActors`). */
    eligibleActors: Actor[];
  } = $props();

  const mealTypeOrder = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

  type ActorRow = {
    actor: Actor;
    meal: Meal | undefined;
  };

  type Slot = {
    type: (typeof mealTypeOrder)[number];
    rows: ActorRow[];
    allEmpty: boolean;
  };

  const slots = $derived(
    mealTypeOrder.map((type) => {
      const rows: ActorRow[] = eligibleActors.map((actor) => {
        const meal = meals.find((m) => m.mealType === type && m.actor === actor);
        return { actor, meal };
      });
      return {
        type,
        rows,
        allEmpty: rows.every((r) => !r.meal),
      } satisfies Slot;
    }),
  );
</script>

<!-- Single source of truth for the round icon marker so meal and actor icons
     stay visually in sync: same size, same state-driven color. `state` picks
     the paint; the icon itself paints via `currentColor`. -->
{#snippet iconMarker(Icon: Component<{ class?: string }>, state: 'empty' | 'filled')}
  <div
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {state === 'empty'
      ? 'text-text-muted/50 bg-white'
      : 'text-primary bg-white'}"
  >
    <Icon class="h-7 w-7" />
  </div>
{/snippet}

{#snippet indicator(logged: boolean)}
  <!-- One fixed-width right rail so an empty actor's "+" aligns with a logged
       actor's "›" (issue #570). -->
  {#if logged}
    <span class="text-text-muted flex w-5 shrink-0 justify-center text-sm">›</span>
  {:else}
    <span class="text-primary flex w-5 shrink-0 justify-center text-lg leading-none">+</span>
  {/if}
{/snippet}

{#snippet foodRun(items: MealItem[])}
  {#each items as item, i (item.id)}
    {#if i > 0}<span> · </span>{/if}
    <span>{item.name}</span>
  {/each}
{/snippet}

<DayCard label={commonStrings.today.mealsLabel}>
  <div class="divide-surface-dark divide-y">
    {#each slots as { type, rows, allEmpty } (type)}
      {@const cfg = mealConfig[type]}
      {@const Icon = cfg.icon}
      {@const stacked = rows.length > 1}
      {@const allFilled = stacked && rows.every((r) => r.meal)}
      {#if allEmpty}
        <!-- Both/all actors empty → the section collapses to a single "+". -->
        <a
          data-testid="meal-row-{type}"
          href="/meal?type={type}&date={date}&returnTo=/day/{date}"
          class="block"
        >
          <div class="flex items-center gap-3 py-2">
            {@render iconMarker(Icon, 'empty')}
            <div class="min-w-0 flex-1">
              <div class="text-text-muted/70 text-sm font-medium">{cfg.label}</div>
            </div>
            {@render indicator(false)}
          </div>
        </a>
      {:else if !stacked}
        <!-- Single eligible actor → today's single-row card (no actor marker). -->
        {@const row = rows[0]}
        {@const meal = row?.meal}
        <a
          data-testid="meal-row-{type}"
          href="/meal?type={type}&date={meal?.date ?? date}&returnTo=/day/{meal?.date ?? date}"
          class="block"
        >
          <div class="flex items-center gap-3 py-2">
            {@render iconMarker(Icon, 'filled')}
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-text text-sm font-semibold">{cfg.label}</span>
              </div>
              <div class="text-text-muted text-[11px]">
                {@render foodRun(meal?.items ?? [])}
              </div>
            </div>
            {@render indicator(true)}
          </div>
        </a>
      {:else}
        <!-- Multiple eligible actors → stacked per-actor rows under a shared header. -->
        <div data-testid="meal-row-{type}" class="py-2">
          <div class="flex items-center gap-2 px-0.5 pb-1">
            <div class="text-text-muted flex items-center gap-2">
              <Icon class="h-4 w-4" />
              <span class="text-text text-sm font-semibold">{cfg.label}</span>
            </div>
          </div>
          <!-- Both actors filled → one chevron centered across the stacked rows,
               instead of a per-row chevron (issue #585). -->
          <div class="flex items-center gap-2 pl-6">
            <div class="min-w-0 flex-1">
              {#each rows as { actor, meal } (actor)}
                {@const ActorIcon = actorConfig[actor].icon}
                <a
                  data-testid="meal-actor-row-{actor}"
                  href="/meal?type={type}&date={meal?.date ??
                    date}&actor={actor}&returnTo=/day/{meal?.date ?? date}"
                  class="flex items-center gap-2 py-1"
                >
                  {@render iconMarker(ActorIcon, !meal ? 'empty' : 'filled')}
                  <div class="text-text-muted min-w-0 flex-1 text-[11px]">
                    {@render foodRun(meal?.items ?? [])}
                  </div>
                  {#if !allFilled}{@render indicator(!!meal)}{/if}
                </a>
              {/each}
            </div>
            {#if allFilled}{@render indicator(true)}{/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</DayCard>
