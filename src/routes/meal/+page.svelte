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
  import { commonStrings, polozkaWordCs, reintroDayLabel, conflictToastCs } from '$lib/strings/common';

  import { mealConfig } from '$lib/config/meals';
  import { portionStrings } from '$lib/strings/portions';
  import { preparationStrings } from '$lib/strings/preparations';
  import { todayIso, formatDateLongCs } from '$lib/utils/date';
  import { scheduleContext } from '$lib/stores/schedule-context';
  import Toast from '$lib/components/Toast.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import InfoBanner from '$lib/components/InfoBanner.svelte';
  import Button from '$lib/components/Button.svelte';
  import Chip from '$lib/components/Chip.svelte';

  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { mealSession } from '$lib/stores/meal-session';

  let meals = $state<Meal[]>([]);

  const today = $derived(todayIso());
  const targetDate = $derived(page.url.searchParams.get('date') ?? today);
  const returnTo = $derived(page.url.searchParams.get('returnTo') ?? `/day/${targetDate}`);
  const ctx = $derived($scheduleContext);
  const eliminatedToday = $derived(ctx.status === 'ready' ? ctx.eliminatedToday : []);
  const reintroInfo = $derived(ctx.status === 'ready' ? ctx.reintroInfo : null);

  // ── Conflict toast (replaces always-visible conflict banner) ──
  let conflictToastMessage = $state<string | null>(null);
  let conflictToastTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  // ── Autosave toast (shown after silent pill-switch save) ───
  let autosaveToastMessage = $state<string | null>(null);
  let autosaveToastTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  // ── Form state ────────────────────────────────────────────
  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
  type MealTypeKind = typeof mealTypes[number];
  function parseMealType(raw: string | null): MealTypeKind {
    return mealTypes.includes(raw as MealTypeKind) ? (raw as MealTypeKind) : 'lunch';
  }
  let selectedMealType = $state<MealTypeKind>(parseMealType(page.url.searchParams.get('type')));
  let selectedAmount = $state<PortionKind>('portion');
  let expandedCategory = $state<string | null>(null);
  let expandedItemId = $state<string | null>(null);
  let categorySheetOpen = $state(false);
  let currentItems = $state<MealItem[]>([]);
  let mealNotes = $state('');
  let showSuccess = $state(false);
  let customName = $state('');

  // ── Slot loading ──────────────────────────────────────────
  async function loadSlot(mealType: typeof selectedMealType): Promise<void> {
    const result = await mealSession.loadBySlot(targetDate, mealType);
    if (result.ok && result.data) {
      currentItems = result.data.items;
      mealNotes = result.data.notes ?? '';
    } else {
      currentItems = [];
      mealNotes = '';
    }
  }

  onMount(() => { loadSlot(selectedMealType); });

  // ── Pill-switch: autosave current slot, then load new slot ─
  async function selectMealType(newType: typeof selectedMealType): Promise<void> {
    if (newType === selectedMealType) return;

    const previousType = selectedMealType;
    const snapshotItems = $state.snapshot(currentItems);

    if (snapshotItems.length > 0) {
      const meal: Meal = {
        id: `${targetDate}:${previousType}`,
        date: targetDate,
        mealType: previousType,
        actor: 'mother',
        items: snapshotItems,
        notes: mealNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await mealSession.save(meal);
      const n = snapshotItems.length;
      autosaveToastMessage = `✓ ${mealConfig[previousType].label} uložen · ${n} ${polozkaWordCs(n)}`;
      if (autosaveToastTimer) clearTimeout(autosaveToastTimer);
      autosaveToastTimer = setTimeout(() => { autosaveToastMessage = null; }, 2000);
    }

    selectedMealType = newType;
    expandedItemId = null;
    await loadSlot(newType);
  }

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
    // Show transient conflict toast when the added item is eliminated today
    if (partial.allergenId && eliminatedToday.includes(partial.allergenId)) {
      const allergenName = categoryConfig[partial.allergenId as ProtocolAllergenId]?.name ?? partial.allergenId;
      conflictToastMessage = conflictToastCs(allergenName);
      if (conflictToastTimer) clearTimeout(conflictToastTimer);
      conflictToastTimer = setTimeout(() => { conflictToastMessage = null; }, 3000);
    }
  }

  function addCustom() {
    if (!customName.trim()) return;
    addItem({ name: customName.trim(), allergenId: null });
    customName = '';
  }

  function removeItem(id: string) {
    currentItems = currentItems.filter(i => i.id !== id);
  }

  const portionKinds = ['pinch', 'teaspoon', 'spoon', 'portion', 'package'] as const;
  const preparationMethods = ['boiled', 'steamed', 'baked', 'fried'] as const;

  function itemSubtitle(item: MealItem): string {
    const parts: string[] = [];
    const catName = categoryConfig[item.allergenId as ProtocolAllergenId]?.name;
    if (catName) parts.push(catName);
    parts.push(portionStrings[item.amount].short);
    if (item.preparationMethod) parts.push(preparationStrings[item.preparationMethod].label.toLowerCase());
    return parts.join(' · ');
  }

  function toggleExpandItem(id: string): void {
    expandedItemId = expandedItemId === id ? null : id;
  }

  function updateAmount(id: string, amount: PortionKind): void {
    // amount is required — no toggle-to-undefined; tapping active chip is a no-op
    currentItems = currentItems.map(i => i.id === id ? { ...i, amount } : i);
  }

  function updatePreparation(id: string, method: PreparationMethod): void {
    // toggle: tapping the active chip clears preparationMethod back to undefined
    currentItems = currentItems.map(i =>
      i.id === id ? { ...i, preparationMethod: i.preparationMethod === method ? undefined : method } : i
    );
  }

  async function saveMeal() {
    if (currentItems.length === 0) return; // guard for aria-disabled CTA
    const meal: Meal = {
      id: `${targetDate}:${selectedMealType}`,
      date: targetDate,
      mealType: selectedMealType,
      actor: 'mother',
      // $state.snapshot strips Svelte 5 Proxy wrappers → plain JS object
      // that IndexedDB's Structured Clone Algorithm can serialize.
      items: $state.snapshot(currentItems),
      notes: mealNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await mealSession.save(meal);
    meals = [...meals, meal]; // keep in-page list live while still on this screen

    currentItems = [];
    mealNotes = '';
    expandedCategory = null;
    showSuccess = true;
    setTimeout(() => (showSuccess = false), 5000);
    goto(returnTo);
  }

  const todayMeals = $derived(meals.filter(m => m.date === targetDate));

  function isCategoryInMeal(allergenId: string): boolean {
    return currentItems.some(i => i.allergenId === allergenId);
  }
</script>

<div class="page-container pb-24">

  <!-- Sticky header: title row + meal type pills + banners -->
  <div class="sticky top-0 bg-surface z-20 border-b border-surface-dark">
    <PageHeader title={commonStrings.meal.heading} onBack={() => goto(returnTo)}>
      {#snippet right()}
        <p class="body-muted">{formatDateLongCs(targetDate)}</p>
      {/snippet}
    </PageHeader>

    <!-- Meal type pills (text-only, rounded-full) -->
    <div class="flex gap-1.5 px-4 pb-3">
      {#each mealTypes as type}
        <Chip active={selectedMealType === type} onclick={() => selectMealType(type)} class="flex-1">
          {mealConfig[type].label}
        </Chip>
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

    <!-- Conflict warning is now a transient toast (shown via conflictToastMessage below) -->

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
      <p class="micro-label mb-2">
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
            {@const expanded = expandedItemId === item.id}
            <!-- Outer div is the primary tap target for expand/collapse -->
            <div
              data-testid="basket-item"
              data-state={conflict ? 'warning' : undefined}
              role="button"
              tabindex="0"
              aria-expanded={expanded}
              class="rounded-xl overflow-hidden cursor-pointer
                {conflict
                  ? 'border border-warning/40 bg-warning/08'
                  : expanded
                    ? 'border-2 border-primary bg-white'
                    : 'bg-white border border-surface-dark'}"
              onclick={() => toggleExpandItem(item.id)}
              onkeydown={(e) => e.key === 'Enter' && toggleExpandItem(item.id)}
            >
              <!-- Header row (visual only — interaction is on outer div) -->
              <div data-testid="basket-item-header" class="flex items-center gap-3 py-2.5 px-3">
                <!-- Icon -->
                <span class="text-lg shrink-0">
                  {categoryConfig[item.allergenId as ProtocolAllergenId]?.icon ?? '🍽️'}
                </span>

                <!-- Name + subtitle / hint -->
                <div class="flex-1 min-w-0">
                  <p class="text-[12px] font-semibold leading-tight truncate">{item.name}</p>
                  {#if conflict}
                    <p class="text-[10px] text-warning mt-0.5">{commonStrings.meal.conflictItemLabel}</p>
                  {:else if expanded}
                    <p data-testid="edit-hint" class="text-[10px] text-primary mt-0.5">uprav množství a přípravu</p>
                  {:else}
                    <p class="text-[10px] text-text-muted mt-0.5">{itemSubtitle(item)}</p>
                  {/if}
                </div>

                <!-- Remove — stops propagation so it doesn't toggle expand -->
                <button
                  class="text-text-muted text-sm shrink-0 px-1"
                  aria-label="✕"
                  onclick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                >✕</button>
              </div>

              <!-- Expanded chip panel -->
              {#if expanded}
                <div class="px-3 pb-3 space-y-2.5">
                  <!-- Množství chips -->
                  <div>
                    <p class="micro-label mb-1.5">Množství</p>
                    <div class="flex flex-wrap gap-1.5">
                      {#each portionKinds as kind}
                        <Chip
                          active={item.amount === kind}
                          onclick={(e) => { e.stopPropagation(); updateAmount(item.id, kind); }}
                        >
                          {portionStrings[kind].label}
                        </Chip>
                      {/each}
                    </div>
                  </div>

                  <!-- Příprava chips -->
                  <div>
                    <p class="micro-label mb-1.5">Příprava</p>
                    <div class="flex flex-wrap gap-1.5">
                      {#each preparationMethods as method}
                        <Chip
                          active={item.preparationMethod === method}
                          onclick={(e) => { e.stopPropagation(); updatePreparation(item.id, method); }}
                        >
                          {preparationStrings[method].label}
                        </Chip>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
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
        {@const isCatElim = eliminatedToday.includes(cat.allergenId)}
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="body-medium">{cfg.icon} {cfg.name}</p>
            <Button variant="ghost-sm" onclick={() => (expandedCategory = null)}>{actionStrings.back}</Button>
          </div>
          <div class="flex flex-wrap gap-2 pb-1">
            {#each cat.subItems as sub}
              {@const subName = subitemStrings[sub.subitemId]}
              {@const inMeal = currentItems.some(i => i.name === subName)}
              <button
                data-state={inMeal ? 'success' : isCatElim ? 'danger' : undefined}
                class="py-2 px-3 rounded-xl text-sm transition-all border
                  {!inMeal && !isCatElim
                    ? 'bg-surface text-text border-surface-dark hover:border-primary/30'
                    : ''}"
                onclick={() => selectSubItem(cat.allergenId, sub.subitemId, subName)}
              >
                {subName}
                {#if isCatElim && !inMeal}
                  <span class="ml-1 text-[10px] font-semibold">{commonStrings.meal.eliminatedChipLabel}</span>
                {/if}
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

{#if autosaveToastMessage}
  <Toast
    message={autosaveToastMessage}
    type="success"
    onClose={() => { autosaveToastMessage = null; if (autosaveToastTimer) clearTimeout(autosaveToastTimer); }}
  />
{/if}

{#if conflictToastMessage}
  <Toast
    message={conflictToastMessage}
    type="warning"
    onClose={() => { conflictToastMessage = null; if (conflictToastTimer) clearTimeout(conflictToastTimer); }}
  />
{/if}

{#if showSuccess}
  <Toast
    message={commonStrings.meal.mealSavedToast}
    type="success"
    href="/today"
    linkLabel={actionStrings.showDayOverview}
    onClose={() => (showSuccess = false)}
  />
{/if}
