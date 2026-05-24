<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Meal Logging with conflict detection
  // ═══════════════════════════════════════════════════════════
  import type { Meal, MealItem, AmountSize } from '$lib/domain/models';
  import { detectConflicts } from '$lib/domain/schedule-queries';
  import { CATEGORIES, getCategoryById } from '$lib/data/categories';
  import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, AMOUNT_LABELS } from '$lib/data/labels';
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
  let selectedAmount = $state<AmountSize>('portion');
  let expandedCategory = $state<string | null>(null);
  let currentItems = $state<MealItem[]>([]);
  let mealLabel = $state('');
  let showSuccess = $state(false);
  let customName = $state('');

  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
  const amounts = Object.entries(AMOUNT_LABELS) as [AmountSize, { label: string; short: string }][];

  // ── Conflict detection ────────────────────────────────────
  const conflicts = $derived(detectConflicts(currentItems, eliminatedToday));
  const hasConflicts = $derived(conflicts.length > 0);

  function isConflictItem(item: MealItem): boolean {
    return item.categoryId !== null && eliminatedToday.includes(item.categoryId);
  }

  // ── Category interactions ─────────────────────────────────
  function toggleCategory(categoryId: string) {
    const cat = CATEGORIES.find(c => c.categoryId === categoryId);
    if (!cat) return;
    if (cat.subItems.length === 0) {
      addItem({ name: cat.nameCs, categoryId });
      expandedCategory = null;
    } else {
      expandedCategory = expandedCategory === categoryId ? null : categoryId;
    }
  }

  function selectSubItem(categoryId: string, subitemId: string, name: string) {
    addItem({ name, categoryId, subitemId });
    expandedCategory = null;
  }

  function addItem(partial: { name: string; categoryId: string | null; subitemId?: string }) {
    const exists = currentItems.some(i => i.name === partial.name && i.categoryId === partial.categoryId);
    if (exists) return;
    currentItems = [...currentItems, {
      id: crypto.randomUUID(),
      name: partial.name,
      categoryId: partial.categoryId,
      subitemId: partial.subitemId ?? null,
      amount: selectedAmount,
    }];
  }

  function addCustom() {
    if (!customName.trim()) return;
    addItem({ name: customName.trim(), categoryId: null });
    customName = '';
  }

  function removeItem(id: string) {
    currentItems = currentItems.filter(i => i.id !== id);
  }

  function updateAmount(id: string, amount: AmountSize) {
    currentItems = currentItems.map(i => i.id === id ? { ...i, amount } : i);
  }

  function saveMeal() {
    if (currentItems.length === 0) return;
    const meal: Meal = {
      id: crypto.randomUUID(),
      date: today,
      mealType: selectedMealType,
      items: [...currentItems],
      label: mealLabel.trim() || undefined,
      savedAt: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
    };
    // TODO(slice-2): persist to Dexie meals table
    meals = [...meals, meal];

    currentItems = [];
    mealLabel = '';
    expandedCategory = null;
    showSuccess = true;
    setTimeout(() => (showSuccess = false), 5000);
  }

  const canSave = $derived(currentItems.length > 0);
  const todayMeals = $derived(meals.filter(m => m.date === today));

  function isCategoryInMeal(categoryId: string): boolean {
    return currentItems.some(i => i.categoryId === categoryId);
  }
</script>

<div class="page-container pb-8">

  <!-- Header -->
  <div class="sticky top-0 bg-surface z-20 border-b border-surface-dark">
    <PageHeader title="Přidat jídlo" onBack={() => history.back()}>
      {#snippet right()}
        <p class="body-muted">{formatDateLongCs(today)}</p>
      {/snippet}
    </PageHeader>

    <!-- Dosing guidance during reintroduction -->
    {#if reintroInfo}
      {@const cat = getCategoryById(reintroInfo.allergenId)}
      <div class="px-4 pt-2 space-y-1.5">
        <InfoBanner variant="success">
          <p class="text-xs font-medium text-success">
            🔬 Den {reintroInfo.dayInPhase} z {reintroInfo.totalDays}: {reintroInfo.label}
          </p>
          <p class="body-muted mt-0.5">{reintroInfo.guidance} ({cat?.nameCs})</p>
        </InfoBanner>
      </div>
    {/if}

    <!-- Schedule context banner (tappable → schedule) -->
    {#if eliminatedToday.length > 0}
      <div class="px-4 pt-2 pb-3">
        <InfoBanner variant="warning" href="/program" class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-medium text-warning">Dnes vyřazeno:</span>
          {#each eliminatedToday as categoryId}
            {@const cat = getCategoryById(categoryId)}
            {#if cat}
              <span class="text-sm">{cat.icon}</span>
            {/if}
          {/each}
          <span class="text-xs text-warning">
            {eliminatedToday.map(s => getCategoryById(s)?.nameCs).filter(Boolean).join(', ')}
          </span>
          <span class="ml-auto text-xs text-warning/70">Program →</span>
        </InfoBanner>
      </div>
    {/if}
  </div>

  <div class="px-4 pt-4 space-y-5">

    <!-- Meal type -->
    <div>
      <p class="field-label">Typ jídla</p>
      <div class="grid grid-cols-4 gap-2">
        {#each mealTypes as type}
          <button
            class="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all
              {selectedMealType === type ? 'bg-primary text-white shadow-sm' : 'bg-white border border-surface-dark text-text'}"
            onclick={() => (selectedMealType = type)}
          >
            <span class="text-xl">{MEAL_TYPE_ICONS[type]}</span>
            <span>{MEAL_TYPE_LABELS[type]}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Amount selector -->
    <div>
      <p class="field-label">Množství (vyberte před přidáním)</p>
      <div class="flex gap-1.5 overflow-x-auto pb-1">
        {#each amounts as [value, info]}
          <button
            class="shrink-0 py-2 px-3 rounded-xl text-sm font-medium transition-all
              {selectedAmount === value ? 'bg-warning text-white' : 'bg-white border border-surface-dark text-text'}"
            onclick={() => (selectedAmount = value)}
          >
            {info.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Custom item input -->
    <div>
      <p class="field-label">Přidat vlastní potravinu</p>
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={customName}
          placeholder="Název potraviny…"
          class="input-base flex-1 px-3 py-2.5 bg-white"
          onkeydown={(e) => e.key === 'Enter' && addCustom()}
        />
        <button
          class="px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium"
          onclick={addCustom}
        >
          Přidat
        </button>
      </div>
    </div>

    <!-- Conflict warning -->
    {#if hasConflicts}
      <InfoBanner variant="warning">
        <p class="text-sm font-medium text-warning mb-1">⚠ Odchylka od programu</p>
        <p class="body-muted">
          {conflicts.map(i => `${i.name} (${getCategoryById(i.categoryId ?? '')?.nameCs})`).join(', ')} — tyto potraviny jsou dnes vyřazeny.
          Jídlo bude uloženo a odchylka zaznamenána.
        </p>
      </InfoBanner>
    {/if}

    <!-- Category grid -->
    <div>
      <p class="field-label">Alergeny a kategorie</p>
      <div class="grid grid-cols-4 gap-2">
        {#each CATEGORIES as cat (cat.categoryId)}
          {@const inMeal = isCategoryInMeal(cat.categoryId)}
          {@const isElim = eliminatedToday.includes(cat.categoryId)}
          {@const isExpanded = expandedCategory === cat.categoryId}
          <button
            data-state={isExpanded ? 'info' : inMeal ? 'success' : isElim ? 'danger' : undefined}
            class="flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium transition-all relative border
              {!isExpanded && !inMeal && !isElim ? 'bg-white border-surface-dark' : ''}"
            onclick={() => toggleCategory(cat.categoryId)}
          >
            <span class="text-2xl leading-none">{cat.icon}</span>
            <span class="leading-tight text-center">{cat.nameCs}</span>
            {#if isElim && !inMeal}
              <span class="absolute -top-1 -right-1 text-[10px] bg-danger text-white rounded-full w-4 h-4 flex items-center justify-center">!</span>
            {/if}
            {#if inMeal}
              <span class="absolute -top-1 -right-1 text-[10px] bg-success text-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Current meal basket -->
    {#if currentItems.length > 0}
      <div class="card-base">
        <p class="body-medium mb-2">
          {MEAL_TYPE_ICONS[selectedMealType]} {MEAL_TYPE_LABELS[selectedMealType]} — vybrané položky
        </p>
        <div class="space-y-1.5">
          {#each currentItems as item (item.id)}
            <div class="flex items-center gap-2 py-1.5 px-2 rounded-lg
              {isConflictItem(item) ? 'border' : 'bg-surface'}"
              data-state={isConflictItem(item) ? 'warning' : undefined}>
              <span class="text-base shrink-0">
                {getCategoryById(item.categoryId ?? '')?.icon ?? '🍽️'}
              </span>
              <span class="body flex-1 min-w-0 truncate">{item.name}</span>
              {#if isConflictItem(item)}
                <span class="text-xs text-warning shrink-0">⚠</span>
              {/if}
              <!-- Amount selector inline -->
              <select
                class="text-xs border border-surface-dark rounded px-1 py-0.5 bg-white shrink-0"
                value={item.amount}
                onchange={(e) => updateAmount(item.id, (e.target as HTMLSelectElement).value as AmountSize)}
              >
                {#each amounts as [val, info]}
                  <option value={val}>{info.short}</option>
                {/each}
              </select>
              <button class="text-text-muted hover:text-danger text-lg px-0.5 shrink-0" onclick={() => removeItem(item.id)}>×</button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Today's saved meals -->
    {#if todayMeals.length > 0}
      <div>
        <p class="field-label">Dnes uložená jídla</p>
        <div class="space-y-2">
          {#each todayMeals as meal (meal.id)}
            <div class="card-base">
              <div class="flex items-center gap-2 mb-1.5">
                <span>{MEAL_TYPE_ICONS[meal.mealType]}</span>
                <span class="body-medium">{MEAL_TYPE_LABELS[meal.mealType]}</span>
                <span class="body-muted">{meal.savedAt}</span>
              </div>
              <div class="flex flex-wrap gap-1">
                {#each meal.items as item}
                  <span class="text-xs bg-surface rounded-full px-2 py-0.5 text-text
                    {item.categoryId && eliminatedToday.includes(item.categoryId) ? 'bg-warning/10 text-warning' : ''}">
                    {getCategoryById(item.categoryId ?? '')?.icon ?? ''} {item.name}
                    <span class="text-text-muted">{AMOUNT_LABELS[item.amount]?.short}</span>
                  </span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Optional label -->
    {#if currentItems.length > 0}
      <div>
        <input
          type="text"
          bind:value={mealLabel}
          placeholder="Poznámka (volitelné, např. u babičky)"
          class="input-base w-full px-4 py-2.5 bg-white"
        />
      </div>
    {/if}
  </div>
</div>

<!-- Sub-items floating panel -->
{#if expandedCategory}
  {@const cat = getCategoryById(expandedCategory)}
  {#if cat && cat.subItems.length > 0}
    <button
      class="fixed inset-0 z-40"
      onclick={() => (expandedCategory = null)}
      aria-label="Zavřít"
    ></button>
    <div
      class="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl border-t border-primary/30 shadow-lg px-4 pt-4 space-y-3"
      style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
    >
      <div class="flex items-center justify-between">
        <p class="body-medium">{cat.icon} {cat.nameCs}</p>
        <Button variant="ghost-sm" onclick={() => (expandedCategory = null)}>Hotovo</Button>
      </div>
      <div class="flex flex-wrap gap-2 pb-1">
        {#each cat.subItems as sub}
          <button
            data-state={currentItems.some(i => i.name === sub.nameCs) ? 'success' : undefined}
            class="py-2 px-3 rounded-xl text-sm transition-all border
              {currentItems.some(i => i.name === sub.nameCs)
                ? ''
                : 'bg-surface text-text border-surface-dark hover:border-primary/30'}"
            onclick={() => selectSubItem(cat.categoryId, sub.subitemId, sub.nameCs)}
          >
            {sub.nameCs}
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/if}

<!-- Fixed save bar -->
{#if canSave}
  <div
    class="fixed left-0 right-0 bottom-0 bg-white border-t border-surface-dark px-4 pt-3 z-30"
    style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 0.75rem)"
  >
    <div class="max-w-lg mx-auto">
      <Button color={hasConflicts ? 'warning' : 'primary'} onclick={saveMeal}>
        {hasConflicts ? '⚠ Uložit s odchylkou' : 'Uložit'} — {MEAL_TYPE_LABELS[selectedMealType]}
        ({currentItems.length} {currentItems.length === 1 ? 'položka' : currentItems.length <= 4 ? 'položky' : 'položek'})
      </Button>
    </div>
  </div>
{/if}

{#if showSuccess}
  <Toast
    message="✓ Jídlo uloženo"
    type="success"
    href="/day"
    linkLabel="Zobrazit přehled dne →"
    onClose={() => (showSuccess = false)}
  />
{/if}
