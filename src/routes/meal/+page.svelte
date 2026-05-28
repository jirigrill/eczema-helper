<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Meal Logging with conflict detection
  // ═══════════════════════════════════════════════════════════
  import type { Meal, MealItem, PortionKind, PreparationMethod, ProtocolAllergenId } from '$lib/domain/models';
  import { detectConflicts } from '$lib/domain/schedule-queries';
  import { CATEGORIES } from '$lib/data/categories';
  import { getProtocolForAllergen } from '$lib/data/reintroduction-protocols';
  import { categoryConfig } from '$lib/config/categories';
  import { subitemStrings } from '$lib/strings/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings, polozkaWordCs, reintroDayLabel } from '$lib/strings/common';

  import { mealConfig } from '$lib/config/meals';
  import { portionStrings } from '$lib/strings/portions';
  import { todayIso, formatDateLongCs } from '$lib/utils/date';
  import { scheduleContext } from '$lib/stores/schedule-context';
  import Toast from '$lib/components/Toast.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import InfoBanner from '$lib/components/InfoBanner.svelte';
  import Button from '$lib/components/Button.svelte';

  let meals = $state<Meal[]>([]);

  const today = $derived(todayIso());
  const ctx = $derived($scheduleContext);
  const eliminatedToday = $derived(ctx.status === 'ready' ? ctx.eliminatedToday : []);
  const reintroInfo = $derived(ctx.status === 'ready' ? ctx.reintroInfo : null);

  // ── Form state ────────────────────────────────────────────
  let selectedMealType = $state<'breakfast' | 'lunch' | 'snack' | 'dinner'>('lunch');
  let selectedAmount = $state<PortionKind>('portion');
  let expandedCategory = $state<string | null>(null);
  let categorySheetOpen = $state(false);
  let currentItems = $state<MealItem[]>([]);
  let mealNotes = $state('');
  let showSuccess = $state(false);
  let customName = $state('');

  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

  // ── Conflict detection ────────────────────────────────────
  const conflicts = $derived(detectConflicts(currentItems, eliminatedToday));
  const hasConflicts = $derived(conflicts.length > 0);

  function isConflictItem(item: MealItem): boolean {
    return item.allergenId !== null && eliminatedToday.includes(item.allergenId);
  }

  // ── Category interactions ─────────────────────────────────
  function openCategorySheet() {
    categorySheetOpen = true;
  }

  function closeCategorySheet() {
    categorySheetOpen = false;
    expandedCategory = null;
  }

  function toggleCategory(allergenId: string) {
    const cat = CATEGORIES.find(c => c.allergenId === allergenId);
    if (!cat) return;
    if (cat.subItems.length === 0) {
      addItem({ name: categoryConfig[cat.allergenId].name, allergenId });
      expandedCategory = null;
    } else {
      expandedCategory = expandedCategory === allergenId ? null : allergenId;
    }
  }

  function selectSubItem(allergenId: string, subitemId: string, name: string) {
    addItem({ name, allergenId, subitemId });
    closeCategorySheet();
  }

  function addItem(partial: { name: string; allergenId: string | null; subitemId?: string }) {
    const exists = currentItems.some(i => i.name === partial.name && i.allergenId === partial.allergenId);
    if (exists) return;
    currentItems = [...currentItems, {
      id: crypto.randomUUID(),
      name: partial.name,
      allergenId: partial.allergenId,
      subitemId: partial.subitemId ?? null,
      amount: selectedAmount,
    }];
  }

  function addCustom() {
    if (!customName.trim()) return;
    addItem({ name: customName.trim(), allergenId: null });
    customName = '';
  }

  function removeItem(id: string) {
    currentItems = currentItems.filter(i => i.id !== id);
  }

  const preparationLabels: Record<PreparationMethod, string> = {
    boiled:  'vařené',
    steamed: 'dušené',
    baked:   'pečené',
    fried:   'smažené',
  } as const;

  function itemSubtitle(item: MealItem): string {
    const parts: string[] = [];
    const catName = categoryConfig[item.allergenId as ProtocolAllergenId]?.name;
    if (catName) parts.push(catName);
    parts.push(portionStrings[item.amount].short);
    if (item.preparationMethod) parts.push(preparationLabels[item.preparationMethod]);
    return parts.join(' · ');
  }

  function saveMeal() {
    if (currentItems.length === 0) return; // guard for aria-disabled CTA
    const meal: Meal = {
      id: crypto.randomUUID(),
      date: today,
      mealType: selectedMealType,
      actor: 'mother',
      items: [...currentItems],
      notes: mealNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    // TODO(slice-2): persist to Dexie meals table
    meals = [...meals, meal];

    currentItems = [];
    mealNotes = '';
    expandedCategory = null;
    showSuccess = true;
    setTimeout(() => (showSuccess = false), 5000);
  }

  const todayMeals = $derived(meals.filter(m => m.date === today));

  function isCategoryInMeal(allergenId: string): boolean {
    return currentItems.some(i => i.allergenId === allergenId);
  }
</script>

<div class="page-container pb-24">

  <!-- Sticky header: title row + meal type pills + banners -->
  <div class="sticky top-0 bg-surface z-20 border-b border-surface-dark">
    <PageHeader title={commonStrings.meal.heading} onBack={() => history.back()}>
      {#snippet right()}
        <p class="body-muted">{formatDateLongCs(today)}</p>
      {/snippet}
    </PageHeader>

    <!-- Meal type pills (text-only, rounded-full) -->
    <div class="flex gap-1.5 px-4 pb-3">
      {#each mealTypes as type}
        <button
          class="flex-1 py-1.5 rounded-full text-xs font-medium transition-all
            {selectedMealType === type ? 'bg-primary text-white font-semibold' : 'bg-surface-dark text-text-muted'}"
          onclick={() => (selectedMealType = type)}
        >
          {mealConfig[type].label}
        </button>
      {/each}
    </div>

    <!-- Dosing guidance during reintroduction -->
    {#if reintroInfo}
      {@const cat = categoryConfig[reintroInfo.allergenId as ProtocolAllergenId]}
      {@const protocolDay = getProtocolForAllergen(reintroInfo.allergenId)?.days[reintroInfo.dayInPhase - 1]}
      <div class="px-4 pt-2 space-y-1.5">
        <InfoBanner variant="success">
          <p class="text-xs font-medium text-success">
            {reintroDayLabel(reintroInfo.dayInPhase, reintroInfo.totalDays)}
          </p>
          <p class="body-muted mt-0.5">{protocolDay?.instructionCs ?? ''} ({cat?.name})</p>
        </InfoBanner>
      </div>
    {/if}

    <!-- Schedule context banner (tappable → schedule) -->
    {#if eliminatedToday.length > 0}
      <div class="px-4 pt-2 pb-3">
        <InfoBanner variant="warning" href="/program" class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-medium text-warning">{commonStrings.meal.todayExcluded}</span>
          {#each eliminatedToday as allergenId}
            {@const cat = categoryConfig[allergenId as ProtocolAllergenId]}
            {#if cat}
              <span class="text-sm">{cat.icon}</span>
            {/if}
          {/each}
          <span class="text-xs text-warning">
            {eliminatedToday.map(s => categoryConfig[s as ProtocolAllergenId]?.name).filter(Boolean).join(', ')}
          </span>
          <span class="ml-auto text-xs text-warning/70">Program →</span>
        </InfoBanner>
      </div>
    {/if}
  </div>

  <div class="px-4 pt-4 space-y-5">

    <!-- Custom item input -->
    <div>
      <p class="field-label">{commonStrings.meal.customFoodLabel}</p>
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={customName}
          placeholder={commonStrings.meal.customFoodPlaceholder}
          class="input-base flex-1 px-3 py-2.5 bg-white"
          onkeydown={(e) => e.key === 'Enter' && addCustom()}
        />
        <button
          class="px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium"
          onclick={addCustom}
        >
          {actionStrings.add}
        </button>
      </div>
    </div>

    <!-- Conflict warning -->
    {#if hasConflicts}
      <InfoBanner variant="warning">
        <p class="text-sm font-medium text-warning mb-1">{commonStrings.meal.conflictTitle}</p>
        <p class="body-muted">
          {conflicts.map(i => `${i.name} (${categoryConfig[i.allergenId as ProtocolAllergenId]?.name})`).join(', ')} — {commonStrings.meal.conflictNote}
          {commonStrings.meal.conflictSaveNote}
        </p>
      </InfoBanner>
    {/if}

    <!-- Categories accordion (collapsed by default, opens bottom sheet) -->
    <div>
      <button
        class="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl bg-white border border-surface-dark"
        onclick={openCategorySheet}
      >
        <span class="text-text-muted text-xs">▸</span>
        <span class="flex-1 text-sm font-medium text-text text-left">{commonStrings.meal.allCategoriesLabel}</span>
        <span class="text-xs text-text-muted">{CATEGORIES.length}</span>
      </button>
    </div>

    <!-- "V tomto jídle" basket — always rendered -->
    <div>
      <p class="text-[10px] text-text-muted uppercase tracking-wide mb-2">
        {commonStrings.meal.inThisMealLabel}
      </p>

      {#if currentItems.length === 0}
        <!-- Empty state -->
        <div class="border border-dashed border-surface-dark rounded-xl px-4 py-5 text-center">
          <p class="text-xs text-text-muted">{commonStrings.meal.basketEmptyHint}</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each currentItems as item (item.id)}
            {@const conflict = isConflictItem(item)}
            <div
              class="flex items-center gap-3 py-2.5 px-3 rounded-xl
                {conflict
                  ? 'border border-warning/40 bg-warning/08'
                  : 'bg-white border border-surface-dark'}"
              data-state={conflict ? 'warning' : undefined}
            >
              <!-- Icon -->
              <span class="text-lg shrink-0">
                {categoryConfig[item.allergenId as ProtocolAllergenId]?.icon ?? '🍽️'}
              </span>

              <!-- Name + subtitle -->
              <div class="flex-1 min-w-0">
                <p class="text-[12px] font-semibold leading-tight truncate">{item.name}</p>
                {#if conflict}
                  <p class="text-[10px] text-warning mt-0.5">{commonStrings.meal.conflictItemLabel}</p>
                {:else}
                  <p class="text-[10px] text-text-muted mt-0.5">{itemSubtitle(item)}</p>
                {/if}
              </div>

              <!-- Remove -->
              <button
                class="text-text-muted text-sm shrink-0 px-1"
                aria-label="✕"
                onclick={() => removeItem(item.id)}
              >✕</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Today's saved meals -->
    {#if todayMeals.length > 0}
      <div>
        <p class="field-label">{commonStrings.meal.todaySavedLabel}</p>
        <div class="space-y-2">
          {#each todayMeals as meal (meal.id)}
            <div class="card-base">
              <div class="flex items-center gap-2 mb-1.5">
                <span>{mealConfig[meal.mealType].icon}</span>
                <span class="body-medium">{mealConfig[meal.mealType].label}</span>
                <span class="body-muted">{new Date(meal.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div class="flex flex-wrap gap-1">
                {#each meal.items as item}
                  <span class="text-xs bg-surface rounded-full px-2 py-0.5 text-text
                    {item.allergenId && eliminatedToday.includes(item.allergenId) ? 'bg-warning/10 text-warning' : ''}">
                    {categoryConfig[item.allergenId as ProtocolAllergenId]?.icon ?? ''} {item.name}
                    <span class="text-text-muted">{portionStrings[item.amount].short}</span>
                  </span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Notes textarea — progressive disclosure: only when basket non-empty -->
    {#if currentItems.length > 0}
      <div>
        <label class="field-label block mb-1" for="meal-notes">
          {commonStrings.meal.notesLabelPrefix} {mealConfig[selectedMealType].label}
        </label>
        <textarea
          id="meal-notes"
          rows={2}
          bind:value={mealNotes}
          placeholder={commonStrings.meal.notesPlaceholder}
          class="input-base w-full px-4 py-2.5 bg-white resize-none"
        ></textarea>
      </div>
    {/if}
  </div>
</div>

<!-- Category bottom sheet -->
{#if categorySheetOpen}
  <button
    class="fixed inset-0 z-40"
    onclick={closeCategorySheet}
    aria-label={actionStrings.close}
  ></button>
  <div
    role="dialog"
    aria-modal="true"
    aria-label={commonStrings.meal.allCategoriesLabel}
    class="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl border-t border-surface-dark shadow-lg px-4 pt-4 space-y-3"
    style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
  >
    <div class="flex items-center justify-between mb-2">
      <p class="body-medium">{commonStrings.meal.allCategoriesLabel}</p>
      <Button variant="ghost-sm" onclick={closeCategorySheet}>{actionStrings.done}</Button>
    </div>

    <!-- Sub-items panel for an expanded category -->
    {#if expandedCategory}
      {@const cat = CATEGORIES.find(c => c.allergenId === expandedCategory)}
      {#if cat && cat.subItems.length > 0}
        {@const cfg = categoryConfig[cat.allergenId]}
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="body-medium">{cfg.icon} {cfg.name}</p>
            <Button variant="ghost-sm" onclick={() => (expandedCategory = null)}>{actionStrings.back}</Button>
          </div>
          <div class="flex flex-wrap gap-2 pb-1">
            {#each cat.subItems as sub}
              {@const subName = subitemStrings[sub.subitemId]}
              <button
                data-state={currentItems.some(i => i.name === subName) ? 'success' : undefined}
                class="py-2 px-3 rounded-xl text-sm transition-all border
                  {currentItems.some(i => i.name === subName)
                    ? ''
                    : 'bg-surface text-text border-surface-dark hover:border-primary/30'}"
                onclick={() => selectSubItem(cat.allergenId, sub.subitemId, subName)}
              >
                {subName}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <!-- Full category list inside the sheet -->
      <div class="grid grid-cols-4 gap-2">
        {#each CATEGORIES as cat (cat.allergenId)}
          {@const cfg = categoryConfig[cat.allergenId]}
          {@const inMeal = isCategoryInMeal(cat.allergenId)}
          {@const isElim = eliminatedToday.includes(cat.allergenId)}
          <button
            data-state={inMeal ? 'success' : isElim ? 'danger' : undefined}
            class="flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium transition-all relative border
              {!inMeal && !isElim ? 'bg-white border-surface-dark' : ''}"
            onclick={() => toggleCategory(cat.allergenId)}
          >
            <span class="text-2xl leading-none">{cfg.icon}</span>
            <span class="leading-tight text-center">{cfg.name}</span>
            {#if isElim && !inMeal}
              <span class="absolute -top-1 -right-1 text-[10px] bg-danger text-white rounded-full w-4 h-4 flex items-center justify-center">!</span>
            {/if}
            {#if inMeal}
              <span class="absolute -top-1 -right-1 text-[10px] bg-success text-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<!-- Sticky CTA — always rendered; aria-disabled when basket is empty -->
<div
  class="fixed left-0 right-0 bottom-0 z-30 px-4 pt-2 bg-gradient-to-t from-surface via-surface to-transparent"
  style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
>
  <div class="max-w-lg mx-auto">
    <button
      aria-disabled={currentItems.length === 0 ? 'true' : 'false'}
      onclick={saveMeal}
      class="w-full py-3 rounded-xl font-semibold text-sm transition-all
        {currentItems.length === 0
          ? 'bg-surface-dark text-text-muted cursor-default'
          : hasConflicts
            ? 'bg-warning text-white'
            : 'bg-primary text-white'}"
    >
      {#if currentItems.length === 0}
        {actionStrings.done}
      {:else if hasConflicts}
        {actionStrings.saveWithConflict} — {mealConfig[selectedMealType].label} ({currentItems.length} {polozkaWordCs(currentItems.length)})
      {:else}
        {actionStrings.done} — {mealConfig[selectedMealType].label} ({currentItems.length} {polozkaWordCs(currentItems.length)})
      {/if}
    </button>
  </div>
</div>

{#if showSuccess}
  <Toast
    message={commonStrings.meal.mealSavedToast}
    type="success"
    href="/today"
    linkLabel={actionStrings.showDayOverview}
    onClose={() => (showSuccess = false)}
  />
{/if}
