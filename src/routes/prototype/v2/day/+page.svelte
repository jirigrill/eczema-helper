<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Day Detail View
  // ═══════════════════════════════════════════════════════════
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import type { PrototypeState, DailyAssessment, ReintroductionEvaluation, AllergenOutcome, SkinStatusOutcome } from '../_lib/types';
  import { getPhaseForDate, getEliminatedSlugsForDate, detectConflicts, getReintroductionDayInfo, isPhaseEndForEvaluation, generateDemoData, insertRestDays, addTrainingPhase, getTrainingRemindersForDate } from '../_lib/schedule-engine';
  import { DEMO_MEALS, MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, AMOUNT_LABELS, getCategoryBySlug, formatDateCs, formatDateLongCs, todayIso, addDays } from '../_lib/data';
  import EczemaCheck from '../_lib/EczemaCheck.svelte';

  const STATE_KEY = 'v2-prototype-state';

  let state = $state<PrototypeState>({ answers: null, schedule: null, meals: [], assessments: [], evaluations: [] });
  let dateStripEl = $state<HTMLElement | null>(null);

  onMount(() => {
    const paramDate = $page.url.searchParams.get('date');
    let isInitial = true;

    function refresh() {
      try {
        const raw = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null');
        if (raw) {
          const simToday = addDays(todayIso(), raw.dateOffset ?? 0);
          const demo = raw.schedule ? generateDemoData(raw.schedule, simToday) : { meals: [], assessments: [], evaluations: [], mutatedSchedule: raw.schedule };
          state = {
            ...raw,
            schedule: demo.mutatedSchedule ?? raw.schedule,
            meals: [...demo.meals, ...DEMO_MEALS, ...(raw.meals ?? [])],
            assessments: [...demo.assessments, ...(raw.assessments ?? [])],
            evaluations: [...demo.evaluations, ...(raw.evaluations ?? [])],
          };
          if (isInitial) {
            selectedDate = paramDate ?? simToday;
            isInitial = false;
          } else {
            selectedDate = simToday;
          }
        }
      } catch { /* */ }
    }
    refresh();
    window.addEventListener('v2-state-change', refresh);
    tick().then(() => scrollTodayIntoView());
    return () => window.removeEventListener('v2-state-change', refresh);
  });

  const today = $derived(addDays(todayIso(), state.dateOffset ?? 0));
  let selectedDate = $state(todayIso());

  const dateStrip = $derived.by(() => {
    if (!state.schedule) return Array.from({ length: 7 }, (_, i) => addDays(today, i - 3));
    const start = state.schedule.startDate;
    const end = selectedDate > today ? selectedDate : today;
    const days: string[] = [];
    let cursor = start;
    let safety = 0;
    while (cursor <= end && safety < 120) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
      safety++;
    }
    if (days.length === 0) days.push(today);
    return days;
  });

  function scrollTodayIntoView() {
    if (!dateStripEl) return;
    const todayBtn = dateStripEl.querySelector<HTMLElement>('[data-today="true"]');
    todayBtn?.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }

  const weekdayShort = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('cs-CZ', { weekday: 'short' });

  const dayNumber = (iso: string) => new Date(iso + 'T00:00:00').getDate();

  const schedule = $derived(state.schedule);
  const currentPhase = $derived(schedule ? getPhaseForDate(schedule, selectedDate) : null);
  const eliminatedSlugs = $derived(schedule ? getEliminatedSlugsForDate(schedule, selectedDate) : []);
  const reintroInfo = $derived(schedule ? getReintroductionDayInfo(schedule, selectedDate) : null);
  const currentAssessment = $derived(state.assessments?.find(a => a.date === selectedDate));
  const trainingReminders = $derived(
    schedule ? getTrainingRemindersForDate(schedule, selectedDate, state.meals) : []
  );

  function stripDemoData(s: PrototypeState): PrototypeState {
    return {
      ...s,
      meals: s.meals.filter(m => !m.id.startsWith('demo-')),
      assessments: [],
      evaluations: s.evaluations.filter(e => !e.phaseId.startsWith('demo-')),
    };
  }

  function saveAssessment(a: DailyAssessment) {
    const updated = {
      ...state,
      assessments: [
        ...(state.assessments ?? []).filter(x => x.date !== a.date),
        a,
      ],
    };
    const toPersist = stripDemoData(updated);
    toPersist.assessments = updated.assessments.filter(x => {
      return (state.assessments ?? []).some(orig => orig.date === x.date) || x.date === a.date;
    });
    localStorage.setItem(STATE_KEY, JSON.stringify(toPersist));
    state = updated;
  }

  // End-of-phase evaluation (reset, elimination, reintroduction)
  const isEvalDay = $derived(schedule ? isPhaseEndForEvaluation(schedule, selectedDate) : false);
  const evalPhase = $derived(isEvalDay ? currentPhase : null);
  const evalAllergenSlug = $derived(
    evalPhase?.type === 'reintroduction' ? (evalPhase.categorySlugs[0] ?? null)
    : evalPhase?.type === 'reset' ? '_baseline'
    : evalPhase?.type === 'elimination' ? '_elimination'
    : null
  );
  const existingEval = $derived(
    evalPhase ? (state.evaluations ?? []).find(e => e.phaseId === evalPhase.id) : undefined
  );

  const allergenOutcomeOptions: { value: AllergenOutcome; label: string; icon: string; color: string }[] = [
    { value: 'tolerated',       label: 'Toleruje',      icon: '✅', color: 'bg-success/10 border-success/40 text-success' },
    { value: 'mild-reaction',   label: 'Mírná reakce',  icon: '🟡', color: 'bg-warning/10 border-warning/40 text-warning' },
    { value: 'clear-reaction',  label: 'Jasná reakce',  icon: '🟠', color: 'bg-danger/10 border-danger/30 text-danger' },
    { value: 'severe-reaction', label: 'Silná reakce',  icon: '🔴', color: 'bg-danger/10 border-danger/40 text-danger' },
  ];
  const skinStatusOutcomeOptions: { value: SkinStatusOutcome; label: string; icon: string; color: string }[] = [
    { value: 'improved',    label: 'Zlepšení',     icon: '✓',  color: 'bg-success/10 border-success/40 text-success' },
    { value: 'unchanged',   label: 'Beze změny',   icon: '—',  color: 'bg-surface border-surface-dark text-text' },
    { value: 'worsened',    label: 'Zhoršení',     icon: '!',  color: 'bg-warning/10 border-warning/40 text-warning' },
    { value: 'new-lesions', label: 'Nová ložiska', icon: '!!', color: 'bg-danger/10 border-danger/40 text-danger' },
  ];
  const isSkinStatusPhase = $derived(evalPhase?.type === 'reset' || evalPhase?.type === 'elimination');
  const activeOutcomeOptions = $derived(isSkinStatusPhase ? skinStatusOutcomeOptions : allergenOutcomeOptions);
  let evalOutcome = $state<AllergenOutcome | SkinStatusOutcome | null>(null);
  let evalNotes = $state('');
  let evalSaved = $state(false);

  $effect(() => {
    if (existingEval) {
      evalOutcome = existingEval.outcome;
      evalNotes = existingEval.notes ?? '';
      evalSaved = true;
    } else {
      evalOutcome = null;
      evalNotes = '';
      evalSaved = false;
    }
  });

  function saveEvaluation() {
    if (!evalOutcome || !evalPhase) return;
    const evaluation: ReintroductionEvaluation = {
      phaseId: evalPhase.id,
      phaseType: isSkinStatusPhase ? 'skin-status' : 'allergen-test',
      outcome: evalOutcome,
      ...(evalPhase.type === 'reintroduction' && evalAllergenSlug ? { allergenSlug: evalAllergenSlug } : {}),
      notes: evalNotes.trim() || undefined,
      date: selectedDate,
    };

    const rawState = JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}');
    rawState.evaluations = [
      ...(rawState.evaluations ?? []).filter((e: ReintroductionEvaluation) => e.phaseId !== evalPhase.id),
      evaluation,
    ];

    // Schedule mutation on negative reintroduction outcome
    if (
      evalPhase.type === 'reintroduction' &&
      (evalOutcome === 'clear-reaction' || evalOutcome === 'severe-reaction')
    ) {
      const restDays = evalOutcome === 'severe-reaction' ? 2 : 1;
      let mutated = insertRestDays(rawState.schedule, evalPhase.id, restDays);
      mutated = addTrainingPhase(mutated, evalPhase.categorySlugs[0], evalPhase.id);
      rawState.schedule = mutated;
    }

    localStorage.setItem(STATE_KEY, JSON.stringify(rawState));
    state = {
      ...state,
      schedule: rawState.schedule,
      evaluations: [...(state.evaluations ?? []).filter(e => e.phaseId !== evalPhase.id), evaluation],
    };
    evalSaved = true;
    window.dispatchEvent(new CustomEvent('v2-state-change'));
  }

  const evalMutationFeedback = $derived.by(() => {
    if (!evalSaved || !evalPhase || evalPhase.type !== 'reintroduction') return null;
    if (evalOutcome !== 'clear-reaction' && evalOutcome !== 'severe-reaction') return null;
    const restDays = evalOutcome === 'severe-reaction' ? 2 : 1;
    const cat = getCategoryBySlug(evalPhase.categorySlugs[0]);
    return { restDays, allergenName: cat?.nameCs ?? evalPhase.categorySlugs[0], allergenIcon: cat?.icon ?? '' };
  });

  // Indicator dots for date strip
  function hasMeals(date: string): boolean {
    return state.meals.some(m => m.date === date);
  }
  function hasConflictsOnDate(date: string): boolean {
    const elim = schedule ? getEliminatedSlugsForDate(schedule, date) : [];
    return state.meals.filter(m => m.date === date).some(m => detectConflicts(m.items, elim).length > 0);
  }
  function hasAssessment(date: string): boolean {
    return !!(state.assessments?.some(a => a.date === date));
  }

  const allowedProtocol = $derived(
    ['dairy', 'eggs', 'wheat', 'soy'].filter(s => !eliminatedSlugs.includes(s))
  );

  const dayMeals = $derived(state.meals.filter(m => m.date === selectedDate));

  const allConflicts = $derived(
    dayMeals.flatMap(meal =>
      detectConflicts(meal.items, eliminatedSlugs).map(item => ({
        ...item,
        mealLabel: MEAL_TYPE_LABELS[meal.mealType],
      }))
    )
  );

  function phaseColor(type: string): string {
    return ({
      reset: 'bg-surface-dark/60 text-text-muted',
      elimination: 'bg-danger/10 text-danger',
      reintroduction: 'bg-success/10 text-success',
      rest: 'bg-surface-dark/40 text-text-muted',
      training: 'bg-primary/10 text-primary',
    } as Record<string, string>)[type] ?? 'bg-surface text-text';
  }
</script>

<div class="max-w-lg mx-auto">

  <!-- Sticky date strip -->
  <div class="sticky top-0 bg-surface z-20 border-b border-surface-dark px-2 pt-4 pb-3">
    <div class="flex gap-1 overflow-x-auto" bind:this={dateStripEl}>
      {#each dateStrip as date}
        {@const isSelected = selectedDate === date}
        {@const isToday = date === today}
        <button
          data-today={isToday ? 'true' : undefined}
          class="shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[52px]
            {isSelected
              ? 'bg-primary text-white'
              : isToday
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted'}"
          onclick={() => (selectedDate = date)}
        >
          <span class="text-[10px] uppercase tracking-wide">{weekdayShort(date)}</span>
          <span class="text-base font-bold">{dayNumber(date)}</span>
          <!-- Indicator dots -->
          <div class="flex gap-0.5 h-1.5 items-center">
            {#if hasMeals(date)}
              <span class="w-1 h-1 rounded-full {hasConflictsOnDate(date) ? 'bg-warning' : 'bg-success'}"></span>
            {/if}
            {#if hasAssessment(date)}
              <span class="w-1 h-1 rounded-full {isSelected ? 'bg-white/70' : 'bg-primary/60'}"></span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>

  <div class="px-4 pt-4 pb-8 space-y-4">

    <h1 class="text-base font-semibold text-text">{formatDateLongCs(selectedDate)}</h1>

    {#if !schedule}
      <p class="text-text-muted text-sm">Nejprve dokončete dotazník.</p>
    {:else}

      <!-- Rest phase card -->
      {#if currentPhase?.type === 'rest'}
        <div class="bg-surface rounded-2xl border border-surface-dark p-4 space-y-2">
          <p class="text-sm font-semibold text-text">⏸️ Klidový režim</p>
          <p class="text-xs text-text-muted">
            Kůže se zotavuje — jezte pouze potraviny, které miminko toleruje. Žádné nové alergeny.
          </p>
          {#if eliminatedSlugs.length > 0}
            <div class="flex flex-wrap gap-1.5 pt-1">
              {#each eliminatedSlugs as slug}
                {@const cat = getCategoryBySlug(slug)}
                {#if cat}
                  <span class="inline-flex items-center gap-1 text-xs bg-danger/10 text-danger rounded-full px-2.5 py-1">
                    {cat.icon} {cat.nameCs}
                  </span>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <!-- Schedule status card -->
        <div class="bg-white rounded-2xl border border-surface-dark p-4 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-text-muted uppercase tracking-wide">Program</p>
            {#if currentPhase}
              <span class="text-xs rounded-full px-2.5 py-1 font-medium {phaseColor(currentPhase.type)}">
                {currentPhase.label}
              </span>
            {/if}
          </div>

          {#if currentPhase?.type === 'reset'}
            <div class="bg-success/5 rounded-xl px-3 py-2 border border-success/20">
              <p class="text-xs text-success font-medium">Jezte normálně</p>
              <p class="text-xs text-text-muted mt-0.5">Zaznamenáváme výchozí stav kůže miminka.</p>
            </div>
            {#if eliminatedSlugs.length > 0}
              <div>
                <p class="text-xs text-text-muted mb-1.5">Trvalá omezení (vaše / miminka):</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each eliminatedSlugs as slug}
                    {@const cat = getCategoryBySlug(slug)}
                    {#if cat}
                      <span class="inline-flex items-center gap-1 text-xs bg-surface text-text-muted rounded-full px-2.5 py-1">
                        {cat.icon} {cat.nameCs}
                      </span>
                    {/if}
                  {/each}
                </div>
              </div>
            {/if}
          {:else}
            <div>
              <p class="text-xs text-text-muted mb-1.5">Vyřazeno:</p>
              {#if eliminatedSlugs.length > 0}
                <div class="flex flex-wrap gap-1.5">
                  {#each eliminatedSlugs as slug}
                    {@const cat = getCategoryBySlug(slug)}
                    {#if cat}
                      <span class="inline-flex items-center gap-1 text-xs bg-danger/10 text-danger rounded-full px-2.5 py-1">
                        {cat.icon} {cat.nameCs}
                      </span>
                    {/if}
                  {/each}
                </div>
              {:else}
                <p class="text-sm text-success">Žádná omezení</p>
              {/if}
            </div>
          {/if}

          {#if currentPhase?.type === 'reintroduction'}
            <div class="border-t border-surface-dark pt-3">
              <p class="text-xs text-text-muted mb-1.5">Dnes testujete:</p>
              <div class="flex flex-wrap gap-1.5">
                {#each currentPhase.categorySlugs as slug}
                  {@const cat = getCategoryBySlug(slug)}
                  {#if cat}
                    <span class="inline-flex items-center gap-1 text-xs bg-success/10 text-success rounded-full px-2.5 py-1 font-medium">
                      {cat.icon} {cat.nameCs} — sledujte reakci
                    </span>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}

          {#if allowedProtocol.length > 0}
            <div class="border-t border-surface-dark pt-3">
              <p class="text-xs text-text-muted mb-1.5">Povoleno (protokolové):</p>
              <div class="flex flex-wrap gap-1.5">
                {#each allowedProtocol as slug}
                  {@const cat = getCategoryBySlug(slug)}
                  {#if cat}
                    <span class="inline-flex items-center gap-1 text-xs bg-success/10 text-success rounded-full px-2.5 py-1">
                      {cat.icon} {cat.nameCs}
                    </span>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}

          <a
            href="/prototype/v2/program"
            class="block border-t border-surface-dark pt-3 text-xs text-primary font-medium text-right"
          >
            Celý program →
          </a>
        </div>
      {/if}

      <!-- Conflict summary -->
      {#if allConflicts.length > 0}
        <div class="bg-warning/10 border border-warning/30 rounded-2xl p-4">
          <p class="text-sm font-semibold text-warning mb-2">
            ⚠ {allConflicts.length} {allConflicts.length === 1 ? 'odchylka' : allConflicts.length <= 4 ? 'odchylky' : 'odchylek'} od programu
          </p>
          <div class="space-y-1">
            {#each allConflicts as conflict}
              <p class="text-xs text-text-muted">
                <span class="font-medium text-text">{conflict.name}</span>
                ({getCategoryBySlug(conflict.categorySlug ?? '')?.nameCs}) — {conflict.mealLabel}
              </p>
            {/each}
          </div>
          <p class="text-xs text-text-muted mt-2 border-t border-warning/20 pt-2">
            Odchylky jsou zaznamenány, ale neresetují časovač.
          </p>
        </div>
      {/if}

      <!-- Meals section -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-text">
            Jídla
            {#if dayMeals.length > 0}
              <span class="ml-1 text-xs bg-surface-dark text-text-muted rounded-full px-2 py-0.5">{dayMeals.length}</span>
            {/if}
          </p>
          <a href="/prototype/v2/meal" class="text-sm text-primary font-medium">+ Přidat</a>
        </div>

        {#if dayMeals.length === 0}
          <div class="bg-white rounded-xl border border-surface-dark p-6 text-center">
            <p class="text-text-muted text-sm">Žádná jídla pro tento den</p>
            <a href="/prototype/v2/meal" class="text-primary text-sm font-medium mt-2 inline-block">Přidat jídlo →</a>
          </div>
        {:else}
          <div class="space-y-2">
            {#each dayMeals as meal (meal.id)}
              <div class="bg-white rounded-xl border border-surface-dark p-3">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-base">{MEAL_TYPE_ICONS[meal.mealType]}</span>
                  <span class="text-sm font-medium text-text">{MEAL_TYPE_LABELS[meal.mealType]}</span>
                  <span class="text-xs text-text-muted">{meal.savedAt}</span>
                  {#if meal.label}
                    <span class="text-xs text-text-muted italic">· {meal.label}</span>
                  {/if}
                </div>
                <div class="flex flex-wrap gap-1">
                  {#each meal.items as item}
                    {@const isConflict = item.categorySlug !== null && eliminatedSlugs.includes(item.categorySlug)}
                    <span class="inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1
                      {isConflict ? 'bg-warning/15 text-warning border border-warning/30' : 'bg-surface text-text'}">
                      {getCategoryBySlug(item.categorySlug ?? '')?.icon ?? ''}
                      {item.name}
                      <span class="text-text-muted">{AMOUNT_LABELS[item.amount]?.short}</span>
                      {#if isConflict}<span>⚠</span>{/if}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Dosing guidance card (reintroduction phases only) -->
      {#if reintroInfo}
        {@const cat = getCategoryBySlug(reintroInfo.allergenSlug)}
        <div class="rounded-2xl border p-4 space-y-1
          {reintroInfo.isEvaluationDay
            ? 'bg-primary/10 border-primary/30'
            : 'bg-success/10 border-success/30'}">
          <p class="text-sm font-semibold {reintroInfo.isEvaluationDay ? 'text-primary' : 'text-success'}">
            🔬 Den {reintroInfo.dayInPhase} z {reintroInfo.totalDays}: {reintroInfo.label}
          </p>
          <p class="text-xs text-text-muted">{reintroInfo.guidance}{cat ? ` (${cat.nameCs})` : ''}</p>
        </div>
      {/if}

      <!-- End-of-phase evaluation (last day of reset, elimination, or reintroduction) -->
      {#if isEvalDay && evalPhase}
        {@const evalCat = evalPhase.type === 'reintroduction' ? getCategoryBySlug(evalPhase.categorySlugs[0]) : null}
        <div class="bg-primary/5 border border-primary/30 rounded-2xl p-4 space-y-4">
          <div>
            {#if evalPhase.type === 'reset'}
              <p class="text-sm font-semibold text-text">⚖️ Hodnocení: Výchozí stav kůže</p>
              <p class="text-xs text-text-muted mt-1">
                Jak vypadá kůže miminka na konci resetovací fáze? Toto bude referenční bod.
              </p>
            {:else if evalPhase.type === 'elimination'}
              <p class="text-sm font-semibold text-text">⚖️ Hodnocení: Konec eliminační fáze</p>
              <p class="text-xs text-text-muted mt-1">
                Jak vypadá kůže miminka po eliminaci? Ustálil se stav oproti začátku?
              </p>
            {:else}
              <p class="text-sm font-semibold text-text">⚖️ Celkové hodnocení: {evalCat?.icon} {evalCat?.nameCs}</p>
              <p class="text-xs text-text-muted mt-1">
                Jak miminko reagovalo na {evalCat?.nameCs?.toLowerCase()} během testování?
              </p>
            {/if}
          </div>

          <div class="grid grid-cols-2 gap-2">
            {#each activeOutcomeOptions as opt}
              <button
                type="button"
                class="flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all
                  {evalOutcome === opt.value
                    ? opt.color + ' shadow-sm'
                    : 'bg-white border-surface-dark text-text hover:border-primary/30'}"
                onclick={() => { evalOutcome = opt.value; evalSaved = false; }}
              >
                <span class="text-lg leading-none">{opt.icon}</span>
                <span class="leading-tight">{opt.label}</span>
              </button>
            {/each}
          </div>

          {#if evalOutcome}
            <textarea
              bind:value={evalNotes}
              placeholder="Poznámka (volitelné) — např. drobné zarudnutí 2. den…"
              rows="2"
              class="w-full rounded-xl border border-surface-dark px-3 py-2 text-sm text-text resize-none
                focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
              oninput={() => (evalSaved = false)}
            ></textarea>

            <button
              class="w-full py-3 rounded-xl font-semibold text-sm transition-all
                {evalSaved ? 'bg-success/20 text-success' : 'bg-primary text-white'}"
              onclick={saveEvaluation}
              disabled={evalSaved}
            >
              {evalSaved ? '✓ Hodnocení uloženo' : 'Uložit hodnocení'}
            </button>

            {#if evalMutationFeedback}
              <div class="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2 mt-1">
                <p class="text-sm font-semibold text-text">Program upraven</p>
                <div class="space-y-1.5 text-xs text-text-muted">
                  <p>⏸️ Přidán klidový režim ({evalMutationFeedback.restDays === 1 ? '1 den' : `${evalMutationFeedback.restDays} dny`}) — kůže se zotavuje</p>
                  <p>🏋️ Zahájen trénink: {evalMutationFeedback.allergenIcon} {evalMutationFeedback.allergenName} — malé dávky pro budování tolerance</p>
                  <p>📅 Zbývající fáze posunuty</p>
                </div>
                <a
                  href="/prototype/v2/program"
                  class="inline-block text-xs text-primary font-medium mt-1"
                >Zobrazit aktualizovaný program →</a>
              </div>
            {/if}
          {/if}
        </div>
      {/if}

      <!-- Daily eczema assessment -->
      <EczemaCheck
        date={selectedDate}
        assessment={currentAssessment}
        reintroductionAllergenSlug={currentPhase?.type === 'reintroduction' ? (currentPhase.categorySlugs[0] ?? null) : null}
        onSave={saveAssessment}
      />

      <!-- Training reminder card -->
      {#if trainingReminders.length > 0}
        <div class="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
          <p class="text-xs font-semibold text-primary uppercase tracking-wide">Tréninková dávka</p>
          <p class="text-xs text-text-muted">
            Malá dávka (max 1 lžička) pro budování tolerance. Max 2× týdně.
          </p>
          {#each trainingReminders as reminder}
            <div class="flex items-center gap-2 bg-white rounded-xl border border-surface-dark px-3 py-2">
              <span class="text-sm font-medium text-text">{reminder.label}</span>
              <span class="text-xs text-text-muted ml-auto">
                {reminder.daysSinceLastDose >= 999 ? 'dosud bez dávky' : `${reminder.daysSinceLastDose} dní od poslední`}
              </span>
            </div>
          {/each}
        </div>
      {/if}

    {/if}
  </div>
</div>
