<script lang="ts">
  import type { Actor, AllergenId, Meal, MealItem } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { categoryStrings } from '$lib/strings/categories';
  import { mealConfig } from '$lib/config/meals';
  import { actorConfig } from '$lib/config/actors';
  import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
  import { mealConflicts } from '$lib/domain/schedule-queries';
  import DayCard from './DayCard.svelte';

  let {
    date,
    meals,
    eligibleActors,
    eliminatedByActor,
  }: {
    date: string;
    meals: Meal[];
    /** Actors who may log at the current feeding stage (`getEligibleActors`). */
    eligibleActors: Actor[];
    /** Per-actor combined eliminated set (protocol ∪ that actor's permanent). */
    eliminatedByActor: Partial<Record<Actor, AllergenId[]>>;
  } = $props();

  const catalog = new BundledCatalogAdapter();
  const mealTypeOrder = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

  type ActorRow = {
    actor: Actor;
    meal: Meal | undefined;
    conflictItemIds: Set<string>;
  };

  type Slot = {
    type: (typeof mealTypeOrder)[number];
    rows: ActorRow[];
    /** Distinct conflicting allergens across all actors, deduplicated. */
    conflictAllergens: AllergenId[];
    allEmpty: boolean;
  };

  const slots = $derived(
    mealTypeOrder.map((type) => {
      const merged = new Set<AllergenId>();
      const rows: ActorRow[] = eligibleActors.map((actor) => {
        const meal = meals.find((m) => m.mealType === type && m.actor === actor);
        const eliminated = eliminatedByActor[actor] ?? [];
        // One pass per meal yields both the offending item ids (to danger-style
        // each food) and the offending allergens (merged once per section into
        // the shared warning pills below).
        const { itemIds, allergens } = meal
          ? mealConflicts(meal.items, eliminated, catalog)
          : { itemIds: new Set<string>(), allergens: [] as AllergenId[] };
        for (const a of allergens) merged.add(a);
        return { actor, meal, conflictItemIds: itemIds };
      });
      return {
        type,
        rows,
        conflictAllergens: [...merged],
        allEmpty: rows.every((r) => !r.meal),
      } satisfies Slot;
    }),
  );
</script>

{#snippet allergenPills(allergens: AllergenId[])}
  {#each allergens as allergenId (allergenId)}
    <span class="bg-danger/15 text-danger rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      >⚠ {categoryStrings[allergenId as keyof typeof categoryStrings]?.name ?? allergenId}</span
    >
  {/each}
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

{#snippet foodRun(items: MealItem[], conflictItemIds: Set<string>)}
  {#each items as item, i (item.id)}
    {#if i > 0}<span> · </span>{/if}
    {@const itemConflict = conflictItemIds.has(item.id)}
    <span
      class={itemConflict ? 'text-danger font-medium' : ''}
      data-conflict={itemConflict ? 'true' : undefined}>{item.name}</span
    >
  {/each}
{/snippet}

<DayCard label={commonStrings.today.mealsLabel}>
  <div class="divide-surface-dark divide-y">
    {#each slots as { type, rows, conflictAllergens, allEmpty } (type)}
      {@const cfg = mealConfig[type]}
      {@const Icon = cfg.icon}
      {@const stacked = rows.length > 1}
      {#if allEmpty}
        <!-- Both/all actors empty → the section collapses to a single "+". -->
        <a
          data-testid="meal-row-{type}"
          href="/meal?type={type}&date={date}&returnTo=/day/{date}"
          class="block"
        >
          <div class="flex items-center gap-3 py-2">
            <div
              class="text-text-muted/50 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"
            >
              <Icon class="h-5 w-5" />
            </div>
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
        {@const conflictItemIds = row?.conflictItemIds ?? new Set<string>()}
        <a
          data-testid="meal-row-{type}"
          href="/meal?type={type}&date={meal?.date ?? date}&returnTo=/day/{meal?.date ?? date}"
          class="block"
        >
          <div class="flex items-center gap-3 py-2">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {conflictItemIds.size >
              0
                ? 'bg-danger/15 text-danger'
                : 'text-primary bg-white'}"
            >
              <Icon class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-text text-sm font-semibold">{cfg.label}</span>
                {@render allergenPills(conflictAllergens)}
              </div>
              <div class="text-text-muted text-[11px]">
                {@render foodRun(meal?.items ?? [], conflictItemIds)}
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
          {#if conflictAllergens.length > 0}
            <div class="mb-1 ml-6 flex flex-wrap gap-1">
              {@render allergenPills(conflictAllergens)}
            </div>
          {/if}
          <div class="pl-6">
            {#each rows as { actor, meal, conflictItemIds } (actor)}
              {@const ActorIcon = actorConfig[actor].icon}
              <a
                data-testid="meal-actor-row-{actor}"
                href="/meal?type={type}&date={meal?.date ?? date}&returnTo=/day/{meal?.date ??
                  date}"
                class="flex items-center gap-2 py-1"
              >
                <span
                  class="border-surface-dark text-text-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                >
                  <ActorIcon class="h-5 w-5" />
                </span>
                <div class="text-text-muted min-w-0 flex-1 text-[11px]">
                  {@render foodRun(meal?.items ?? [], conflictItemIds)}
                </div>
                {@render indicator(!!meal)}
              </a>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</DayCard>
