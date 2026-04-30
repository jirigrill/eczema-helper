<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Unified Program Page
  // ═══════════════════════════════════════════════════════════
  import { onMount } from 'svelte';
  import type { AppState, SchedulePhase } from '$lib/domain/models';
  import { getPhaseForDate, getEliminatedSlugsForDate, detectConflicts, getScheduleProgress, appendReTestPhases, getReintroductionDayInfo } from '$lib/domain/schedule';
  import { getCategoryById } from '$lib/data/categories';
  import { loadState, saveState, notifyStateChange } from '$lib/data/storage';
  import { formatDateCs, formatDateLongCs, todayIso, addDays } from '$lib/utils/date';

  let state = $state<AppState>({ answers: null, schedule: null, meals: [], assessments: [], evaluations: [] });
  let showToast = $state(false);
  let selectedRetestSlugs = $state<string[]>([]);
  let expandedPhaseId = $state<string | null>(null);

  onMount(() => {
    function refresh() {
      const raw = loadState();
      if (raw.answers) state = raw;
    }
    refresh();
    window.addEventListener('v2-state-change', refresh);
    return () => window.removeEventListener('v2-state-change', refresh);
  });

  const today = $derived(addDays(todayIso(), state.dateOffset ?? 0));
  const schedule = $derived(state.schedule);
  const currentPhase = $derived(schedule ? getPhaseForDate(schedule, today) : null);
  const eliminatedToday = $derived(schedule ? getEliminatedSlugsForDate(schedule, today) : []);
  const permanentSlugs = $derived(schedule?.permanentEliminations ?? []);
  const protocolEliminated = $derived(eliminatedToday.filter(s => !permanentSlugs.includes(s)));
  const progress = $derived(schedule ? getScheduleProgress(schedule, today) : null);
  const isBeforeSchedule = $derived(!!schedule && today < schedule.startDate);
  const isProgramDone = $derived(!!schedule && !isBeforeSchedule && today > schedule.estimatedEndDate && activeTrainingPhases.length === 0);
  const reintroInfo = $derived(schedule ? getReintroductionDayInfo(schedule, today) : null);
  const activeTrainingPhases = $derived(
    schedule ? schedule.phases.filter(p => p.type === 'training' && p.startDate <= today && (p.endDate === '' || p.endDate >= today)) : []
  );

  type DisplayAllergen = { slug: string; icon: string; name: string; reason: string };
  const permanentEliminated = $derived.by((): DisplayAllergen[] => {
    const answers = state.answers;
    function normSlug(s: string) {
      return s.includes(':') && !s.startsWith('other:') ? s.split(':')[0] : s;
    }
    return permanentSlugs.flatMap((s): DisplayAllergen[] => {
      const isMother = answers?.motherAllergies.some(a => normSlug(a) === s) ?? false;
      const isBaby = answers?.babyConfirmedAllergies.some(a => normSlug(a) === s) ?? false;
      const reason = isMother && isBaby ? 'vaše + miminka' : isMother ? 'vaše alergie' : 'alergie miminka';
      if (s.startsWith('other:')) return [{ slug: s, icon: '🌿', name: s.slice(6), reason }];
      const cat = getCategoryById(s.split(':')[0]);
      if (!cat) return [];
      return [{ slug: s, icon: cat.icon, name: cat.nameCs, reason }];
    });
  });

  function getAllergenStatusRows(phase: SchedulePhase): { slug: string; status: 'testing' | 'eliminated' | 'reintroduced' }[] {
    if (!schedule || phase.type !== 'reintroduction') return [];
    const phaseIndex = schedule.phases.indexOf(phase);
    const alreadyReintroduced = new Set<string>();
    for (let i = 0; i < phaseIndex; i++) {
      if (schedule.phases[i].type === 'reintroduction') {
        for (const s of schedule.phases[i].categoryIds) alreadyReintroduced.add(s);
      }
    }
    const protocolSlugs = schedule.phases.find(p => p.type === 'elimination')?.categoryIds ?? [];
    return protocolSlugs
      .filter(slug => !schedule.permanentEliminations.includes(slug))
      .map(slug => {
        if (phase.categoryIds.includes(slug)) return { slug, status: 'testing' as const };
        if (alreadyReintroduced.has(slug)) return { slug, status: 'reintroduced' as const };
        return { slug, status: 'eliminated' as const };
      })
      .sort((a, b) => ({ testing: 0, eliminated: 1, reintroduced: 2 }[a.status] - { testing: 0, eliminated: 1, reintroduced: 2 }[b.status]));
  }

  function addRetestPhases() {
    if (!schedule || !state.answers || selectedRetestSlugs.length === 0) return;
    const updatedSchedule = appendReTestPhases(schedule, selectedRetestSlugs, state.answers.eczemaSeverity);
    state = { ...state, schedule: updatedSchedule };
    saveState(state);
    notifyStateChange();
    selectedRetestSlugs = [];
  }

  function phaseIcon(type: SchedulePhase['type']): string {
    return ({ reset: '🔄', elimination: '🚫', reintroduction: '🔬', rest: '⏸️', training: '' } as Record<string, string>)[type] ?? '📋';
  }

  function isCompleted(phase: SchedulePhase): boolean {
    if (!phase.endDate) return false;
    return phase.endDate < today;
  }
  function isCurrent(phase: SchedulePhase): boolean {
    if (!phase.endDate) return phase.startDate <= today;
    return phase.startDate <= today && phase.endDate >= today;
  }

  function dnyCs(n: number): string {
    if (n === 1) return '1 den';
    if (n <= 4) return `${n} dny`;
    return `${n} dní`;
  }

  function phaseDayCount(phase: SchedulePhase): number {
    return Math.round((new Date(phase.endDate + 'T00:00:00').getTime() - new Date(phase.startDate + 'T00:00:00').getTime()) / 86400000) + 1;
  }

  function currentDayInPhase(phase: SchedulePhase): number {
    return Math.round((new Date(today + 'T00:00:00').getTime() - new Date(phase.startDate + 'T00:00:00').getTime()) / 86400000) + 1;
  }

  import type { ReintroductionEvaluation } from '$lib/domain/models';

  function evalLabel(ev: ReintroductionEvaluation): string {
    if (ev.phaseType === 'skin-status') {
      return ev.outcome === 'improved' ? 'Zlepšení' : ev.outcome === 'unchanged' ? 'Beze změny' : ev.outcome === 'worsened' ? 'Zhoršení' : 'Nová ložiska';
    }
    return ev.outcome === 'tolerated' ? 'Toleruje' : ev.outcome === 'mild-reaction' ? 'Mírná reakce' : ev.outcome === 'clear-reaction' ? 'Jasná reakce' : 'Silná reakce';
  }

  function evalColor(ev: ReintroductionEvaluation): string {
    if (ev.phaseType === 'skin-status') {
      return ev.outcome === 'improved' ? 'text-success' : ev.outcome === 'unchanged' ? 'text-text-muted' : ev.outcome === 'worsened' ? 'text-warning' : 'text-danger';
    }
    return ev.outcome === 'tolerated' ? 'text-success' : ev.outcome === 'mild-reaction' ? 'text-warning' : 'text-danger';
  }

  function nodeColor(phaseEval: ReintroductionEvaluation | undefined): string {
    if (!phaseEval) return 'bg-surface-dark';
    const o = phaseEval.outcome;
    if (o === 'tolerated' || o === 'improved') return 'bg-success';
    if (o === 'mild-reaction' || o === 'unchanged') return 'bg-warning';
    return 'bg-danger';
  }

  const nonTrainingPhases = $derived(
    schedule ? schedule.phases.filter((p: SchedulePhase) => p.type !== 'training') : []
  );

  type TrainingBand = { slug: string; label: string; startIndex: number; endIndex: number };
  const trainingBands = $derived.by((): TrainingBand[] => {
    if (!schedule) return [];
    return schedule.phases
      .filter((p: SchedulePhase) => p.type === 'training' && p.startDate <= today)
      .map((tp: SchedulePhase) => {
        const slug = tp.categoryIds[0];
        const cat = getCategoryById(slug);
        let startIdx = nonTrainingPhases.findIndex((p: SchedulePhase) =>
          p.endDate ? p.endDate >= tp.startDate : p.startDate <= today
        );
        if (startIdx < 0) startIdx = Math.max(0, nonTrainingPhases.length - 1);
        let endIdx = startIdx;
        for (let i = nonTrainingPhases.length - 1; i >= startIdx; i--) {
          if (nonTrainingPhases[i].startDate <= today) { endIdx = i; break; }
        }
        return { slug, label: cat?.nameCs ?? slug, startIndex: startIdx, endIndex: endIdx };
      })
      .filter((b: TrainingBand) => b.startIndex <= b.endIndex);
  });

  function isInTrainingBand(phaseIndex: number): TrainingBand | null {
    return trainingBands.find((b: TrainingBand) => phaseIndex >= b.startIndex && phaseIndex <= b.endIndex) ?? null;
  }

  // Count conflict meals in a phase (handles in-progress phases by using today as fallback)
  function phaseConflictCount(phase: SchedulePhase): { count: number; items: { name: string; icon: string; date: string }[] } {
    if (!schedule) return { count: 0, items: [] };
    const eliminated = getEliminatedSlugsForDate(schedule, phase.startDate);
    const phaseEnd = phase.endDate || today;
    const conflicts: { name: string; icon: string; date: string }[] = [];
    for (const meal of state.meals.filter((m: { date: string }) => m.date >= phase.startDate && m.date <= phaseEnd)) {
      for (const conflict of detectConflicts(meal.items, eliminated)) {
        if (!conflicts.some(c => c.name === conflict.name && c.date === meal.date)) {
          const cat = getCategoryById(conflict.categoryId ?? '');
          conflicts.push({ name: conflict.name, icon: cat?.icon ?? '🍽️', date: meal.date });
        }
      }
    }
    return { count: conflicts.length, items: conflicts.slice(0, 3) };
  }

  function handleEditSchedule() {
    showToast = true;
    setTimeout(() => (showToast = false), 2500);
  }
</script>

<div class="px-4 pt-4 pb-6 space-y-4 max-w-lg mx-auto">

  {#if !schedule}
    <p class="text-text-muted text-sm">Nejprve dokončete dotazník.</p>
  {:else}

    <!-- ═══ Hero card: progress + current phase + CTA ═══ -->
    <div class="bg-white rounded-2xl border border-surface-dark p-4 space-y-3">
      <div class="flex items-center gap-4">
        <!-- Progress ring -->
        <div class="shrink-0 relative w-16 h-16">
          <svg class="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="27" fill="none" stroke="var(--color-surface-dark)" stroke-width="5"/>
            <circle cx="32" cy="32" r="27" fill="none" stroke="var(--color-primary)" stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray={2 * Math.PI * 27}
              stroke-dashoffset={2 * Math.PI * 27 * (1 - (isBeforeSchedule ? 0 : (progress?.percentComplete ?? 0)) / 100)}
              style="transition: stroke-dashoffset 0.6s ease"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-[11px] font-bold text-text">{isBeforeSchedule ? 0 : (progress?.percentComplete ?? 0)}%</span>
          </div>
        </div>

        <!-- Phase info -->
        <div class="flex-1 min-w-0">
          {#if isBeforeSchedule}
            <p class="font-semibold text-text text-sm">Program ještě nezačal</p>
            <p class="text-xs text-text-muted mt-0.5">Začíná {formatDateCs(schedule.startDate)}</p>
          {:else if isProgramDone}
            <p class="font-semibold text-text text-sm">Program dokončen 🎉</p>
            <p class="text-xs text-text-muted mt-0.5">{schedule.phases.length} fází · {formatDateLongCs(today)}</p>
          {:else if currentPhase}
            <p class="font-semibold text-text text-sm leading-snug">{currentPhase.label}</p>
            <p class="text-xs text-text-muted mt-0.5">
              den {currentDayInPhase(currentPhase)}{currentPhase.endDate ? ` z ${phaseDayCount(currentPhase)}` : ''} · {formatDateLongCs(today)}
            </p>
          {/if}
        </div>
      </div>

      <!-- Phase-specific context -->
      {#if !isBeforeSchedule && !isProgramDone && currentPhase}
        <div class="space-y-3 border-t border-surface-dark pt-3">

          {#if currentPhase.type === 'reset'}

            <div>
              <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Co dělat</p>
              <p class="text-xs text-text-muted">Jezte normálně — zaznamenáváme <strong>výchozí stav kůže</strong> miminka. Denně zaznamenejte stav kůže v přehledu dne.</p>
            </div>
            {#if permanentEliminated.length > 0}
              <div>
                <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Trvalá omezení</p>
                <p class="text-xs text-text-muted mb-2">Těmto potravinám se vyhněte i nyní.</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item}
                    <span class="inline-flex items-center gap-1.5 bg-surface border border-surface-dark text-text-muted rounded-full px-2.5 py-1 text-xs font-medium">
                      {item.icon} {item.name}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

          {:else if currentPhase.type === 'elimination'}

            <div>
              <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Co dělat</p>
              <p class="text-xs text-text-muted">Vylučte všechny níže uvedené alergeny — <strong>i ve skryté podobě</strong> (etikety, omáčky, pečivo). Čekáme na ustálení kůže miminka.</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-danger uppercase tracking-wide mb-1.5">Vyřazeno</p>
              <div class="flex flex-wrap gap-1.5">
                {#each protocolEliminated as slug}
                  {@const cat = getCategoryById(slug)}
                  {#if cat}
                    <span class="inline-flex items-center gap-1.5 bg-danger/10 text-danger rounded-full px-2.5 py-1 text-xs font-medium">
                      {cat.icon} {cat.nameCs}
                    </span>
                  {/if}
                {/each}
              </div>
            </div>
            {#if permanentEliminated.length > 0}
              <div>
                <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Trvalá omezení</p>
                <p class="text-xs text-text-muted mb-2">Trvale vyřazeno z vašeho nebo miminkova důvodu.</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item}
                    <span class="inline-flex items-center gap-1.5 bg-surface border border-surface-dark text-text-muted rounded-full px-2.5 py-1 text-xs font-medium">
                      {item.icon} {item.name}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

          {:else if currentPhase.type === 'reintroduction'}
            {@const testCat = getCategoryById(currentPhase.categoryIds[0])}

            <div>
              <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Co dělat</p>
              <p class="text-xs text-text-muted">
                Zařaďte <strong>{testCat?.nameCs?.toLowerCase() ?? ''}</strong> do jídelníčku.
                {#if reintroInfo?.isEvaluationDay}
                  Dnes vyhodnoťte celkovou reakci miminka.
                {:else}
                  Sledujte kůži miminka každý den.
                {/if}
              </p>
            </div>

            {#if testCat}
              <div>
                <p class="text-xs font-semibold text-success uppercase tracking-wide mb-1.5">Testujete</p>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="inline-flex items-center gap-1.5 bg-success/10 text-success rounded-full px-2.5 py-1 text-xs font-medium">
                    {testCat.icon} {testCat.nameCs}
                  </span>
                  {#if reintroInfo}
                    <span class="text-xs text-text-muted">
                      den {reintroInfo.dayInPhase} z {reintroInfo.totalDays} · {reintroInfo.label}
                    </span>
                  {/if}
                </div>
              </div>
            {/if}

            {#if protocolEliminated.length > 0}
              <div>
                <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Stále vyřazeno</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each protocolEliminated as slug}
                    {@const cat = getCategoryById(slug)}
                    {#if cat}
                      <span class="inline-flex items-center gap-1.5 bg-surface border border-surface-dark text-text-muted rounded-full px-2.5 py-1 text-xs font-medium">
                        {cat.icon} {cat.nameCs}
                      </span>
                    {/if}
                  {/each}
                </div>
              </div>
            {/if}

            {#if permanentEliminated.length > 0}
              <div>
                <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Trvalá omezení</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item}
                    <span class="inline-flex items-center gap-1.5 bg-surface border border-surface-dark text-text-muted rounded-full px-2.5 py-1 text-xs font-medium">
                      {item.icon} {item.name}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

          {:else if currentPhase.type === 'rest'}

            <div>
              <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Co dělat</p>
              <p class="text-xs text-text-muted">
                Klidový režim — kůže se zotavuje. Jezte <strong>pouze potraviny, které miminko toleruje</strong>.
                Žádné nové alergeny nezařazujte.
              </p>
            </div>

          {:else if currentPhase.type === 'training'}
            {@const trainingCat = getCategoryById(currentPhase.categoryIds[0])}

            <div>
              <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Co dělat</p>
              <p class="text-xs text-text-muted">
                Tréninková fáze — občas zařaďte malou dávku <strong>{trainingCat?.nameCs?.toLowerCase() ?? ''}</strong> (max 2× týdně, max 1 lžička). Budujete toleranci.
              </p>
            </div>

          {/if}
        </div>

        <!-- ═══ Live phase details ═══ -->
        {@const heroConflicts = phaseConflictCount(currentPhase)}
        {@const heroAssessments = (state.assessments ?? []).filter((a: { date: string }) => a.date >= currentPhase.startDate && a.date <= (currentPhase.endDate || today))}
        {@const heroEval = (state.evaluations ?? []).find((e: ReintroductionEvaluation) => e.phaseId === currentPhase.id)}

        <div class="space-y-3 border-t border-surface-dark pt-3 text-xs">
          <div>
            <p class="font-semibold text-text-muted uppercase tracking-wide mb-1">Odchylky v jídelníčku</p>
            {#if heroConflicts.count === 0}
              <p class="text-text-muted">Žádné odchylky — vše v souladu s programem.</p>
            {:else}
              <p class="text-warning font-medium mb-1">{heroConflicts.count} odchylek</p>
              <div class="space-y-0.5 text-text-muted">
                {#each heroConflicts.items as c}
                  <p>{c.icon} {c.name} · {formatDateCs(c.date)}</p>
                {/each}
                {#if heroConflicts.count > 3}
                  <p class="text-text-muted/60">…a dalších {heroConflicts.count - 3}</p>
                {/if}
              </div>
            {/if}
          </div>

          <div>
            <p class="font-semibold text-text-muted uppercase tracking-wide mb-1">Reakce kůže</p>
            {#if heroAssessments.length === 0}
              <p class="text-text-muted">Žádné záznamy stavu kůže.</p>
            {:else}
              {@const improved = heroAssessments.filter((a: { status: string }) => a.status === 'improved').length}
              {@const unchanged = heroAssessments.filter((a: { status: string }) => a.status === 'unchanged').length}
              {@const worsened = heroAssessments.filter((a: { status: string }) => a.status === 'worsened').length}
              {@const newLesions = heroAssessments.filter((a: { status: string }) => a.status === 'new-lesions').length}
              <div class="flex flex-wrap gap-2 text-text-muted">
                {#if improved > 0}<span class="text-success font-medium">✓ {improved}× zlepšení</span>{/if}
                {#if unchanged > 0}<span>— {unchanged}× beze změny</span>{/if}
                {#if worsened > 0}<span class="text-warning font-medium">! {worsened}× zhoršení</span>{/if}
                {#if newLesions > 0}<span class="text-danger font-medium">!! {newLesions}× nová ložiska</span>{/if}
              </div>
            {/if}
          </div>

          {#if currentPhase.type === 'reintroduction'}
            {@const heroRows = getAllergenStatusRows(currentPhase)}
            {#if heroRows.length > 1}
              <div>
                <p class="font-semibold text-text-muted uppercase tracking-wide mb-1">Stav alergenů</p>
                <div class="space-y-0.5 text-text-muted">
                  {#each heroRows as row}
                    {@const rowCat = getCategoryById(row.slug)}
                    <div class="flex items-center gap-2">
                      <span>{rowCat?.icon ?? ''}</span>
                      <span class="flex-1">{rowCat?.nameCs ?? row.slug}</span>
                      <span class="{row.status === 'reintroduced' ? 'text-success' : 'text-danger/60'}">
                        {row.status === 'testing' ? '✓ otestována' : row.status === 'reintroduced' ? '✓ znovuzavedena' : 'vyřazena'}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}

          <div>
            <p class="font-semibold text-text-muted uppercase tracking-wide mb-1">Celkové hodnocení</p>
            {#if heroEval}
              <p class="font-medium {evalColor(heroEval)}">{evalLabel(heroEval)}{#if heroEval.notes} <span class="font-normal text-text-muted">— {heroEval.notes}</span>{/if}</p>
            {:else}
              <p class="text-text-muted">Hodnocení proběhne na konci fáze.</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- ═══ Timeline: all phases ═══ -->
    <div class="relative">
      <!-- Vertical line -->
      <div class="absolute left-[15px] top-3 bottom-3 w-px bg-surface-dark"></div>

      <div class="space-y-1">
        {#each nonTrainingPhases as phase, phaseIndex (phase.id)}
          {@const done = isCompleted(phase)}
          {@const current = isCurrent(phase)}
          {@const phaseEval = (state.evaluations ?? []).find((e: ReintroductionEvaluation) => e.phaseId === phase.id)}
          {@const trainingBand = isInTrainingBand(phaseIndex)}

          <!-- Training band label on first row -->
          {#if trainingBand && phaseIndex === trainingBand.startIndex}
            {@const bandCat = getCategoryById(trainingBand.slug)}
            <div class="ml-11 -mb-1">
              <span class="text-[10px] text-primary/60 font-medium">
                {bandCat?.icon ?? ''} Trénink: {trainingBand.label}
              </span>
            </div>
          {/if}

          <!-- Phase row -->
          <div class="{trainingBand ? 'border-l-2 border-primary/20 bg-primary/5 rounded-r-lg pl-0.5' : ''}">
          {#if done}
            <!-- Completed: flat row, colored circle by outcome -->
            <button
              type="button"
              class="w-full flex items-center gap-3 py-2 pl-0 pr-2 text-left"
              onclick={() => (expandedPhaseId = expandedPhaseId === phase.id ? null : phase.id)}
            >
              <div class="shrink-0 w-8 h-8 rounded-full {nodeColor(phaseEval)} flex items-center justify-center z-10"></div>
              <span class="text-xs text-text-muted flex-1 truncate">{phase.label}</span>
              <span class="text-xs text-text-muted/50 shrink-0">{formatDateCs(phase.startDate)}{phase.endDate ? `–${formatDateCs(phase.endDate)}` : '–…'}</span>
              <span class="text-xs text-text-muted shrink-0">{expandedPhaseId === phase.id ? '▾' : '▸'}</span>
            </button>

            {#if expandedPhaseId === phase.id}
              {@const conflicts = phaseConflictCount(phase)}
              {#each [(state.assessments ?? []).filter((a: { date: string }) => a.date >= phase.startDate && a.date <= phase.endDate)] as phaseAssessments}
              <div class="ml-11 pb-2 space-y-3 text-xs">

                <!-- Dietary deviations -->
                <div>
                  <p class="font-semibold text-text-muted uppercase tracking-wide mb-1">Odchylky v jídelníčku</p>
                  {#if conflicts.count === 0}
                    <p class="text-text-muted">Žádné odchylky — vše v souladu s programem.</p>
                  {:else}
                    <p class="text-warning font-medium mb-1">{conflicts.count} odchylek</p>
                    <div class="space-y-0.5 text-text-muted">
                      {#each conflicts.items as c}
                        <p>{c.icon} {c.name} · {formatDateCs(c.date)}</p>
                      {/each}
                      {#if conflicts.count > 3}
                        <p class="text-text-muted/60">…a dalších {conflicts.count - 3}</p>
                      {/if}
                    </div>
                  {/if}
                </div>

                <!-- Skin reactions -->
                <div>
                  <p class="font-semibold text-text-muted uppercase tracking-wide mb-1">Reakce kůže</p>
                  {#if phaseAssessments.length === 0}
                    <p class="text-text-muted">Žádné záznamy stavu kůže.</p>
                  {:else}
                    {@const improved = phaseAssessments.filter((a: { status: string }) => a.status === 'improved').length}
                    {@const unchanged = phaseAssessments.filter((a: { status: string }) => a.status === 'unchanged').length}
                    {@const worsened = phaseAssessments.filter((a: { status: string }) => a.status === 'worsened').length}
                    {@const newLesions = phaseAssessments.filter((a: { status: string }) => a.status === 'new-lesions').length}
                    <div class="flex flex-wrap gap-2 text-text-muted">
                      {#if improved > 0}<span class="text-success font-medium">✓ {improved}× zlepšení</span>{/if}
                      {#if unchanged > 0}<span>— {unchanged}× beze změny</span>{/if}
                      {#if worsened > 0}<span class="text-warning font-medium">! {worsened}× zhoršení</span>{/if}
                      {#if newLesions > 0}<span class="text-danger font-medium">!! {newLesions}× nová ložiska</span>{/if}
                    </div>
                    {#if (worsened > 0 || newLesions > 0) && phase.type === 'reintroduction'}
                      {@const phaseCat = getCategoryById(phase.categoryIds[0])}
                      <p class="text-text-muted mt-1">Možná příčina: {phaseCat?.icon} {phaseCat?.nameCs ?? phase.categoryIds[0]}</p>
                    {/if}
                  {/if}
                </div>

                <!-- Per-allergen status for reintroduction -->
                {#if phase.type === 'reintroduction'}
                  {@const rows = getAllergenStatusRows(phase)}
                  {#if rows.length > 1}
                    <div>
                      <p class="font-semibold text-text-muted uppercase tracking-wide mb-1">Stav alergenů</p>
                      <div class="space-y-0.5 text-text-muted">
                        {#each rows as row}
                          {@const rowCat = getCategoryById(row.slug)}
                          <div class="flex items-center gap-2">
                            <span>{rowCat?.icon ?? ''}</span>
                            <span class="flex-1">{rowCat?.nameCs ?? row.slug}</span>
                            <span class="{row.status === 'reintroduced' ? 'text-success' : 'text-danger/60'}">
                              {row.status === 'testing' ? '✓ otestována' : row.status === 'reintroduced' ? '✓ znovuzavedena' : 'vyřazena'}
                            </span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                {/if}

                <!-- Overall evaluation -->
                <div>
                  <p class="font-semibold text-text-muted uppercase tracking-wide mb-1">Celkové hodnocení</p>
                  {#if phaseEval}
                    <p class="font-medium {evalColor(phaseEval)}">{evalLabel(phaseEval)}{#if phaseEval.notes} <span class="font-normal text-text-muted">— {phaseEval.notes}</span>{/if}</p>
                  {:else}
                    <a
                      href="/day?date={phase.endDate}"
                      class="inline-block text-primary font-medium no-underline"
                    >Zhodnotit fázi →</a>
                  {/if}
                </div>

              </div>
              {/each}
            {/if}

          {:else if current}
            <!-- Current: highlighted node -->
            <div class="flex items-center gap-3 py-2 pl-0 pr-2">
              <div class="shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm z-10 ring-4 ring-primary/20">
                {phaseIcon(phase.type)}
              </div>
              <span class="text-sm font-semibold text-text flex-1">{phase.label}</span>
              <span class="text-xs bg-primary text-white rounded-full px-2 py-0.5 font-medium shrink-0">Teď</span>
            </div>

          {:else}
            <!-- Upcoming: read-only row -->
            <div class="flex items-center gap-3 py-1.5 pl-0 pr-2 opacity-50">
              <div class="shrink-0 w-8 h-8 rounded-full bg-white border-2 border-surface-dark flex items-center justify-center text-sm z-10">
                {phaseIcon(phase.type)}
              </div>
              <span class="text-xs text-text-muted flex-1">{phase.label}</span>
              <span class="text-xs text-text-muted/60 shrink-0">{phase.endDate ? dnyCs(phaseDayCount(phase)) : 'průběžně'}</span>
            </div>
          {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- ═══ End-of-program card ═══ -->
    {#if isProgramDone}
      {@const babyAllergens = state.answers?.babyConfirmedAllergies ?? []}
      <div class="bg-success/10 border border-success/30 rounded-2xl p-5 space-y-4">
        <div class="text-center">
          <p class="text-2xl mb-1">🎉</p>
          <p class="text-base font-bold text-text">Program dokončen!</p>
          <p class="text-sm text-text-muted mt-1">
            {schedule.phases.length} fází · celkem {Math.round(
              (new Date(schedule.estimatedEndDate + 'T00:00:00').getTime() -
               new Date(schedule.startDate + 'T00:00:00').getTime()) / 86400000
            ) + 1} dní
          </p>
        </div>

        {#if babyAllergens.length > 0}
          <div class="border-t border-success/20 pt-4 space-y-3">
            <div>
              <p class="text-sm font-semibold text-text mb-1">Otestování potvrzených alergií miminka</p>
              <p class="text-xs text-text-muted leading-relaxed">
                Testování by mělo proběhnout <strong>velmi opatrně</strong> a ideálně <strong>s lékařem</strong>.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              {#each babyAllergens as slug}
                {@const cat = getCategoryById(slug)}
                {#if cat}
                  {@const isChosen = selectedRetestSlugs.includes(slug)}
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-sm rounded-full px-3 py-1.5 font-medium border transition-all
                      {isChosen ? 'bg-primary text-white border-primary' : 'bg-white text-text border-surface-dark'}"
                    onclick={() => {
                      selectedRetestSlugs = isChosen
                        ? selectedRetestSlugs.filter(s => s !== slug)
                        : [...selectedRetestSlugs, slug];
                    }}
                  >
                    {cat.icon} {cat.nameCs}
                    {#if isChosen}<span class="ml-1">✓</span>{/if}
                  </button>
                {/if}
              {/each}
            </div>
            {#if selectedRetestSlugs.length > 0}
              <button
                class="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm"
                onclick={addRetestPhases}
              >
                Přidat testovací fáze ({selectedRetestSlugs.length})
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Edit notice -->
    <div class="text-center pt-2">
      <button
        class="text-xs text-text-muted border border-surface-dark rounded-xl px-4 py-2 opacity-50"
        onclick={handleEditSchedule}
      >
        Upravit program
      </button>
    </div>
  {/if}
</div>

{#if showToast}
  <div class="fixed bottom-20 left-1/2 -translate-x-1/2 bg-text text-white text-sm rounded-xl px-5 py-3 shadow-lg z-50">
    Tato funkce bude dostupná brzy
  </div>
{/if}
