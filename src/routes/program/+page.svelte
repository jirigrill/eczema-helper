<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Unified Program Page
  // ═══════════════════════════════════════════════════════════
  import type { AllergenStatusValue, ProtocolAllergenId, SchedulePhase } from '$lib/domain/models';
  import { getPhaseForDate, getEliminatedSlugsForDate, detectConflicts } from '$lib/domain/schedule-queries';
  import { getAllergenStatuses } from '$lib/domain/allergen-status';
  import { appendReTestPhases, removeReTestPhase } from '$lib/domain/schedule-builder';
  import { categoryConfig } from '$lib/config/categories';
  import { phaseConfig } from '$lib/config/phases';
  import { addDays, formatDateCs, formatDateLongCs, todayIso } from '$lib/utils/date';
  import { db } from '$lib/db/atopic-db';
  import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
  import { scheduleContext } from '$lib/stores/schedule-context';
  import Toast from '$lib/components/Toast.svelte';
  import ErrorAlert from '$lib/components/error-alert.svelte';
  import AllergenChip from '$lib/components/AllergenChip.svelte';
  import Button from '$lib/components/Button.svelte';

  const scheduleRepo = new DexieScheduleRepository(db);

  let showToast = $state(false);
  let toastMessage = $state('Tato funkce bude dostupná brzy');
  let toastType = $state<'info' | 'success' | 'warning' | 'error'>('info');
  let toastUndo = $state<(() => void) | undefined>(undefined);
  let selectedRetestSlugs = $state<string[]>([]);
  let expandedPhaseId = $state<string | null>(null);
  let meals = $state<import('$lib/domain/models').Meal[]>([]);
  let assessments = $state<import('$lib/domain/models').DailyAssessment[]>([]);
  let evaluations = $state<import('$lib/domain/models').ReintroductionEvaluation[]>([]);

  const today = $derived(todayIso());
  const ctx = $derived($scheduleContext);
  const schedule = $derived(ctx.status === 'ready' ? ctx.schedule : null);
  const answers = $derived(ctx.status === 'ready' ? ctx.answers : null);
  const currentPhase = $derived(schedule ? getPhaseForDate(schedule, today) : null);
  const eliminatedToday = $derived(ctx.status === 'ready' ? ctx.eliminatedToday : []);
  import { getPermanentEliminations } from '$lib/domain/models';
  const permanentSlugs = $derived(schedule ? getPermanentEliminations(schedule) : []);
  const protocolEliminated = $derived(eliminatedToday.filter(s => !permanentSlugs.includes(s)));
  const progress = $derived(ctx.status === 'ready' ? ctx.progress : null);
  const isBeforeSchedule = $derived(!!schedule && today < schedule.startDate);
  const isProgramDone = $derived(!!schedule && !isBeforeSchedule && today > schedule.estimatedEndDate && activeTrainingPhases.length === 0);
  const reintroInfo = $derived(ctx.status === 'ready' ? ctx.reintroInfo : null);
  const activeTrainingPhases = $derived(
    schedule ? schedule.phases.filter(p => p.type === 'tolerance-building' && p.startDate <= today && (p.endDate === '' || p.endDate >= today)) : []
  );

  type DisplayAllergen = { slug: string; icon: string; name: string; reason: string };
  const permanentEliminated = $derived.by((): DisplayAllergen[] => {
    function normSlug(s: string) {
      return s.includes(':') && !s.startsWith('other:') ? s.split(':')[0] : s;
    }
    return permanentSlugs.flatMap((s): DisplayAllergen[] => {
      const isMother = answers?.motherAllergies.some(a => normSlug(a) === s) ?? false;
      const isBaby = answers?.babyConfirmedAllergies.some(a => normSlug(a) === s) ?? false;
      const reason = isMother && isBaby ? 'vaše + miminka' : isMother ? 'vaše alergie' : 'alergie miminka';
      if (s.startsWith('other:')) return [{ slug: s, icon: '🌿', name: s.slice(6), reason }];
      const cfg = categoryConfig[s.split(':')[0] as ProtocolAllergenId];
      if (!cfg) return [];
      return [{ slug: s, icon: cfg.icon, name: cfg.name, reason }];
    });
  });

  // ── Allergen status helpers ────────────────────────────────
  function allergenStatusLabel(status: AllergenStatusValue): string {
    switch (status) {
      case 'testing': return 'testuje se';
      case 'passed': return '✓ znovuzavedena';
      case 'reacted': return 'reagovalo';
      case 'tolerance-building': return 'buduje toleranci';
      case 'eliminated':
      case 'not-yet-tested': return 'vyřazena';
      default: return status;
    }
  }

  function allergenStatusColor(status: AllergenStatusValue): string {
    switch (status) {
      case 'passed': return 'text-success';
      case 'testing': return 'text-primary';
      case 'reacted': return 'text-danger';
      case 'tolerance-building': return 'text-primary/60';
      default: return 'text-text-muted/60';
    }
  }

  function statusOrder(status: AllergenStatusValue): number {
    const order: Partial<Record<AllergenStatusValue, number>> = {
      'testing': 0, 'passed': 1, 'tolerance-building': 2,
      'reacted': 3, 'eliminated': 4, 'not-yet-tested': 4,
    };
    return order[status] ?? 5;
  }

  // Protocol + retest allergens (excludes permanent-mother / permanent-baby).
  // Used in hero card; for historical phases, call getAllergenStatuses directly with addDays(endDate, 1).
  const protocolAllergenStatuses = $derived(
    ctx.status === 'ready'
      ? ctx.allergenStatuses
          .filter(s => s.status !== 'permanent-mother' && s.status !== 'permanent-baby')
          .sort((a, b) => statusOrder(a.status) - statusOrder(b.status))
      : []
  );

  const motherAllergenStatuses = $derived(
    ctx.status === 'ready' ? ctx.allergenStatuses.filter(s => s.status === 'permanent-mother') : []
  );

  const babyPermanentStatuses = $derived(
    ctx.status === 'ready' ? ctx.allergenStatuses.filter(s => s.status === 'permanent-baby') : []
  );

  async function addRetestPhases() {
    if (!schedule || selectedRetestSlugs.length === 0) return;
    const retestResult = appendReTestPhases(schedule, selectedRetestSlugs, today);
    if (!retestResult.ok) {
      const { code, invalidIds } = retestResult.error;
      const names = invalidIds.map(id => categoryConfig[id as ProtocolAllergenId]?.name ?? id).join(', ');
      if (code === 'not-baby-confirmed') {
        toastMessage = `Nelze přidat retest: ${names} není potvrzená alergie miminka.`;
        toastType = 'error';
      } else if (code === 'already-cleared') {
        toastMessage = `Nelze přidat retest: ${names} již bylo úspěšně otestováno.`;
        toastType = 'error';
      } else if (code === 'retest-already-scheduled') {
        toastMessage = `Retest pro ${names} již je naplánován.`;
        toastType = 'warning';
        toastUndo = () => {
          for (const id of invalidIds) cancelRetestPhase(id);
        };
      }
      showToast = true;
      return;
    }
    const saveResult = await scheduleRepo.save(retestResult.data);
    if (!saveResult.ok) { toastMessage = saveResult.error; toastType = 'error'; showToast = true; return; }
    selectedRetestSlugs = [];
  }

  async function cancelRetestPhase(allergenId: string) {
    if (!schedule) return;
    const result = removeReTestPhase(schedule, allergenId, today);
    if (!result.ok) {
      toastMessage = result.error.code === 'protocol-phase'
        ? 'Nelze zrušit: toto je protokolová fáze, ne přidaný retest.'
        : 'Retest nenalezen — možná již proběhl.';
      toastType = 'error';
      toastUndo = undefined;
      showToast = true;
      return;
    }
    const saveResult = await scheduleRepo.save(result.data);
    if (!saveResult.ok) { toastMessage = saveResult.error; toastType = 'error'; toastUndo = undefined; showToast = true; return; }
    toastMessage = 'Retest zrušen.';
    toastType = 'success';
    toastUndo = undefined;
    showToast = true;
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
    schedule ? schedule.phases.filter((p: SchedulePhase) => p.type !== 'tolerance-building') : []
  );

  type TrainingBand = { slug: string; label: string; startIndex: number; endIndex: number };
  const trainingBands = $derived.by((): TrainingBand[] => {
    if (!schedule) return [];
    return schedule.phases
      .filter((p: SchedulePhase) => p.type === 'tolerance-building' && p.startDate <= today)
      .map((tp: SchedulePhase) => {
        const slug = tp.allergenIds[0];
        const cfg = categoryConfig[slug];
        let startIdx = nonTrainingPhases.findIndex((p: SchedulePhase) =>
          p.endDate ? p.endDate >= tp.startDate : p.startDate <= today
        );
        if (startIdx < 0) startIdx = Math.max(0, nonTrainingPhases.length - 1);
        let endIdx = startIdx;
        for (let i = nonTrainingPhases.length - 1; i >= startIdx; i--) {
          if (nonTrainingPhases[i].startDate <= today) { endIdx = i; break; }
        }
        return { slug, label: cfg?.name ?? slug, startIndex: startIdx, endIndex: endIdx };
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
    for (const meal of meals.filter((m: { date: string }) => m.date >= phase.startDate && m.date <= phaseEnd)) {
      for (const conflict of detectConflicts(meal.items, eliminated)) {
        if (!conflicts.some(c => c.name === conflict.name && c.date === meal.date)) {
          const cfg = categoryConfig[conflict.allergenId as ProtocolAllergenId];
          conflicts.push({ name: conflict.name, icon: cfg?.icon ?? '🍽️', date: meal.date });
        }
      }
    }
    return { count: conflicts.length, items: conflicts.slice(0, 3) };
  }

  function handleEditSchedule() {
    toastMessage = 'Tato funkce bude dostupná brzy';
    toastType = 'info';
    showToast = true;
  }
</script>

<div class="page-container pb-24 space-y-4">

  {#if ctx.status === 'error'}
    <ErrorAlert message={ctx.message} />
  {:else if !schedule}
    <p class="body-muted">Nejprve dokončete dotazník.</p>
  {:else}

    <!-- ═══ Hero card: progress + current phase + CTA ═══ -->
    <div class="card-base space-y-3">
      <div class="flex items-center gap-4">
        <!-- Progress ring -->
        <div class="shrink-0 relative w-16 h-16">
          <svg class="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="27" fill="none" stroke="var(--color-surface-dark)" stroke-width="5"/>
            <circle cx="32" cy="32" r="27" fill="none" stroke="var(--color-primary)" stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray={2 * Math.PI * 27}
              stroke-dashoffset={2 * Math.PI * 27 * (1 - (isBeforeSchedule ? 0 : (progress?.percentComplete ?? 0)) / 100)}
              class="progress-ring-animated"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-[11px] font-bold text-text">{isBeforeSchedule ? 0 : (progress?.percentComplete ?? 0)}%</span>
          </div>
        </div>

        <!-- Phase info -->
        <div class="flex-1 min-w-0">
          {#if isBeforeSchedule}
            <p class="body-semibold">Program ještě nezačal</p>
            <p class="body-muted mt-0.5">Začíná {formatDateCs(schedule.startDate)}</p>
          {:else if isProgramDone}
            <p class="body-semibold">Program dokončen 🎉</p>
            <p class="body-muted mt-0.5">{schedule.phases.length} fází · {formatDateLongCs(today)}</p>
          {:else if currentPhase}
            <p class="body-semibold leading-snug">{phaseConfig[currentPhase.type].label}{currentPhase.allergenIds[0] ? `: ${categoryConfig[currentPhase.allergenIds[0]]?.name ?? currentPhase.allergenIds[0]}` : ''}</p>
            <p class="body-muted mt-0.5">
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
              <p class="section-label">Co dělat</p>
              <p class="body-muted">Jezte normálně — zaznamenáváme <strong>výchozí stav kůže</strong> miminka. Denně zaznamenejte stav kůže v přehledu dne.</p>
            </div>
            {#if permanentEliminated.length > 0}
              <div>
                <p class="section-label">Trvalá omezení</p>
                <p class="body-muted mb-2">Těmto potravinám se vyhněte i nyní.</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item (item.slug)}
                    <AllergenChip slug={item.slug} />
                  {/each}
                </div>
              </div>
            {/if}

          {:else if currentPhase.type === 'elimination'}

            <div>
              <p class="section-label">Co dělat</p>
              <p class="body-muted">Vylučte všechny níže uvedené alergeny — <strong>i ve skryté podobě</strong> (etikety, omáčky, pečivo). Čekáme na ustálení kůže miminka.</p>
            </div>
            <div>
              <p class="section-label text-danger">Vyřazeno</p>
              <div class="flex flex-wrap gap-1.5">
                {#each protocolEliminated.filter(s => (s as ProtocolAllergenId) in categoryConfig) as slug (slug)}
                  <AllergenChip {slug} color="warning" />
                {/each}
              </div>
            </div>
            {#if permanentEliminated.length > 0}
              <div>
                <p class="section-label">Trvalá omezení</p>
                <p class="body-muted mb-2">Trvale vyřazeno z vašeho nebo miminkova důvodu.</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item (item.slug)}
                    <AllergenChip slug={item.slug} />
                  {/each}
                </div>
              </div>
            {/if}

          {:else if currentPhase.type === 'reintroduction'}
            {@const testCat = categoryConfig[currentPhase.allergenIds[0]]}

            <div>
              <p class="section-label">Co dělat</p>
              <p class="body-muted">
                Zařaďte <strong>{testCat?.name?.toLowerCase() ?? ''}</strong> do jídelníčku.
                {#if reintroInfo?.isEvaluationDay}
                  Dnes vyhodnoťte celkovou reakci miminka.
                {:else}
                  Sledujte kůži miminka každý den.
                {/if}
              </p>
            </div>

            {#if testCat}
              <div>
                <p class="section-label text-success">Testujete</p>
                <div class="flex flex-wrap items-center gap-1.5">
                  <AllergenChip slug={currentPhase.allergenIds[0]} color="success" />
                  {#if reintroInfo}
                    <span class="body-muted">
                      den {reintroInfo.dayInPhase} z {reintroInfo.totalDays} · {reintroInfo.label}
                    </span>
                  {/if}
                </div>
              </div>
            {/if}

            {#if protocolEliminated.length > 0}
              <div>
                <p class="section-label">Stále vyřazeno</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each protocolEliminated.filter(s => (s as ProtocolAllergenId) in categoryConfig) as slug (slug)}
                    <AllergenChip {slug} />
                  {/each}
                </div>
              </div>
            {/if}

            {#if permanentEliminated.length > 0}
              <div>
                <p class="section-label">Trvalá omezení</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item (item.slug)}
                    <AllergenChip slug={item.slug} />
                  {/each}
                </div>
              </div>
            {/if}

          {:else if currentPhase.type === 'rest'}

            <div>
              <p class="section-label">Co dělat</p>
              <p class="body-muted">{phaseConfig[currentPhase.type].description}</p>
            </div>

          {:else if currentPhase.type === 'tolerance-building'}
            {@const trainingCat = categoryConfig[currentPhase.allergenIds[0]]}

            <div>
              <p class="section-label">Co dělat</p>
              <p class="body-muted">
                Budování tolerance — občas zařaďte malou dávku <strong>{trainingCat?.name?.toLowerCase() ?? ''}</strong> (max 2× týdně, max 1 lžička). Budujete toleranci.
              </p>
            </div>

          {/if}
        </div>

        <!-- ═══ Live phase details ═══ -->
        {@const heroConflicts = phaseConflictCount(currentPhase)}
        {@const heroAssessments = (assessments ?? []).filter((a: { date: string }) => a.date >= currentPhase.startDate && a.date <= (currentPhase.endDate || today))}
        {@const heroEval = (evaluations ?? []).find((e: ReintroductionEvaluation) => e.phaseId === currentPhase.id)}

        <div class="space-y-3 border-t border-surface-dark pt-3 text-xs">
          <div>
            <p class="section-label">Odchylky v jídelníčku</p>
            {#if heroConflicts.count === 0}
              <p class="text-text-muted">Žádné odchylky — vše v souladu s programem.</p>
            {:else}
              <p class="text-warning font-medium mb-1">{heroConflicts.count} odchylek</p>
              <div class="muted-list">
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
            <p class="section-label">Reakce kůže</p>
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
            {#if protocolAllergenStatuses.length > 1}
              <div>
                <p class="section-label">Stav alergenů</p>
                <div class="muted-list">
                  {#each protocolAllergenStatuses as row}
                    {@const rowCat = categoryConfig[row.allergenId as ProtocolAllergenId]}
                    <div class="flex items-center gap-2">
                      <span>{rowCat?.icon ?? ''}</span>
                      <span class="flex-1">{rowCat?.name ?? row.allergenId}</span>
                      {#if schedule?.permanentBaby.includes(row.allergenId)}
                        <span class="text-text-muted/50 text-[10px]">z dotazníku</span>
                      {/if}
                      <span class="{allergenStatusColor(row.status)}">{allergenStatusLabel(row.status)}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}

          <div>
            <p class="section-label">Celkové hodnocení</p>
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
          {@const phaseEval = (evaluations ?? []).find((e: ReintroductionEvaluation) => e.phaseId === phase.id)}
          {@const trainingBand = isInTrainingBand(phaseIndex)}

          <!-- Training band label on first row -->
          {#if trainingBand && phaseIndex === trainingBand.startIndex}
            {@const bandCat = categoryConfig[trainingBand.slug as ProtocolAllergenId]}
            <div class="ml-11 -mb-1">
              <span class="text-[10px] text-primary/60 font-medium">
                {bandCat?.icon ?? ''} Trénink: {trainingBand.label}
              </span>
            </div>
          {/if}

          <!-- Phase row -->
          <div class="{trainingBand ? 'border-l-2 border-primary/30 bg-primary/10 rounded-r-lg pl-0.5' : ''}">
          {#if done}
            <!-- Completed: flat row, colored circle by outcome -->
            <button
              type="button"
              class="w-full flex items-center gap-3 py-2 pl-0 pr-2 text-left"
              onclick={() => (expandedPhaseId = expandedPhaseId === phase.id ? null : phase.id)}
            >
              <div class="shrink-0 w-8 h-8 rounded-full {nodeColor(phaseEval)} flex items-center justify-center z-10"></div>
              <span class="body-muted flex-1 truncate">{phaseConfig[phase.type].label}{phase.allergenIds[0] ? `: ${categoryConfig[phase.allergenIds[0]]?.name ?? phase.allergenIds[0]}` : ''}</span>
              <span class="text-xs text-text-muted/50 shrink-0">{formatDateCs(phase.startDate)}{phase.endDate ? `–${formatDateCs(phase.endDate)}` : '–…'}</span>
              <span class="body-muted shrink-0">{expandedPhaseId === phase.id ? '▾' : '▸'}</span>
            </button>

            {#if expandedPhaseId === phase.id}
              {@const conflicts = phaseConflictCount(phase)}
              {#each [(assessments ?? []).filter((a: { date: string }) => a.date >= phase.startDate && a.date <= phase.endDate)] as phaseAssessments}
              <div class="ml-11 pb-2 space-y-3 text-xs">

                <!-- Dietary deviations -->
                <div>
                  <p class="section-label">Odchylky v jídelníčku</p>
                  {#if conflicts.count === 0}
                    <p class="text-text-muted">Žádné odchylky — vše v souladu s programem.</p>
                  {:else}
                    <p class="text-warning font-medium mb-1">{conflicts.count} odchylek</p>
                    <div class="muted-list">
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
                  <p class="section-label">Reakce kůže</p>
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
                      {@const phaseCat = categoryConfig[phase.allergenIds[0]]}
                      <p class="text-text-muted mt-1">Možná příčina: {phaseCat?.icon} {phaseCat?.name ?? phase.allergenIds[0]}</p>
                    {/if}
                  {/if}
                </div>

                <!-- Per-allergen status for reintroduction -->
                {#if phase.type === 'reintroduction' && schedule}
                  {@const phaseRows = getAllergenStatuses(schedule, addDays(phase.endDate, 1))
                    .filter(s => s.status !== 'permanent-mother' && s.status !== 'permanent-baby')
                    .sort((a, b) => statusOrder(a.status) - statusOrder(b.status))}
                  {#if phaseRows.length > 1}
                    <div>
                      <p class="section-label">Stav alergenů</p>
                      <div class="muted-list">
                        {#each phaseRows as row}
                          {@const rowCat = categoryConfig[row.allergenId as ProtocolAllergenId]}
                          <div class="flex items-center gap-2">
                            <span>{rowCat?.icon ?? ''}</span>
                            <span class="flex-1">{rowCat?.name ?? row.allergenId}</span>
                            {#if schedule.permanentBaby.includes(row.allergenId)}
                              <span class="text-text-muted/50 text-[10px]">z dotazníku</span>
                            {/if}
                            <span class="{allergenStatusColor(row.status)}">{allergenStatusLabel(row.status)}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                {/if}

                <!-- Overall evaluation -->
                <div>
                  <p class="section-label">Celkové hodnocení</p>
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
              <span class="text-sm font-semibold text-text flex-1">{phaseConfig[phase.type].label}{phase.allergenIds[0] ? `: ${categoryConfig[phase.allergenIds[0]]?.name ?? phase.allergenIds[0]}` : ''}</span>
              <span class="text-xs bg-primary text-white rounded-full px-2 py-0.5 font-medium shrink-0">Teď</span>
            </div>

          {:else}
            <!-- Upcoming: read-only row (retest phases get cancel affordance) -->
            {@const isRetestPhase = phase.id.startsWith('retest-')}
            <div class="flex items-center gap-3 py-1.5 pl-0 pr-2 {isRetestPhase ? '' : 'opacity-50'}">
              <div class="shrink-0 w-8 h-8 rounded-full bg-white border-2 border-surface-dark flex items-center justify-center text-sm z-10">
                {phaseIcon(phase.type)}
              </div>
              <span class="body-muted flex-1">{phaseConfig[phase.type].label}{phase.allergenIds[0] ? `: ${categoryConfig[phase.allergenIds[0]]?.name ?? phase.allergenIds[0]}` : ''}</span>
              {#if isRetestPhase}
                <button
                  type="button"
                  class="text-xs text-danger/70 hover:text-danger font-medium shrink-0 px-2 py-1 rounded-lg hover:bg-danger/10 transition-colors"
                  onclick={() => cancelRetestPhase(phase.allergenIds[0])}
                >
                  Zrušit
                </button>
              {:else}
                <span class="text-xs text-text-muted/60 shrink-0">{phase.endDate ? dnyCs(phaseDayCount(phase)) : 'průběžně'}</span>
              {/if}
            </div>
          {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- ═══ End-of-program card ═══ -->
    {#if isProgramDone}
      <div data-state="success" class="border rounded-2xl p-5">
        <div class="text-center">
          <p class="text-2xl mb-1">🎉</p>
          <p class="text-base font-bold text-text">Program dokončen!</p>
          <p class="body-muted mt-1">
            {schedule.phases.length} fází · celkem {Math.round(
              (new Date(schedule.estimatedEndDate + 'T00:00:00').getTime() -
               new Date(schedule.startDate + 'T00:00:00').getTime()) / 86400000
            ) + 1} dní
          </p>
        </div>
      </div>
    {/if}

    <!-- ═══ Permanent allergen sections ═══ -->
    {#if motherAllergenStatuses.length > 0}
      <div class="card-base space-y-3">
        <p class="section-label">Maminčiny alergeny</p>
        <p class="body-muted text-xs">Trvale vyřazeno — vaše vlastní alergie.</p>
        <div class="flex flex-wrap gap-1.5">
          {#each motherAllergenStatuses as s (s.allergenId)}
            <AllergenChip slug={s.allergenId} />
          {/each}
        </div>
      </div>
    {/if}

    {#if babyPermanentStatuses.length > 0}
      <div class="card-base space-y-3">
        <p class="section-label">Potvrzené alergie miminka</p>
        <p class="body-muted text-xs">Trvale vyřazeno. Testování doporučujeme konzultovat s lékařem.</p>
        <div class="flex flex-wrap gap-2">
          {#each babyPermanentStatuses as allergenStatus}
            {@const cat = categoryConfig[allergenStatus.allergenId as ProtocolAllergenId]}
            {#if cat}
              {@const isChosen = selectedRetestSlugs.includes(allergenStatus.allergenId)}
              <button
                type="button"
                class="inline-flex items-center gap-1 text-sm rounded-full px-3 py-1.5 font-medium border transition-all
                  {isChosen ? 'bg-primary text-white border-primary' : 'bg-white text-text border-surface-dark'}"
                onclick={() => {
                  selectedRetestSlugs = isChosen
                    ? selectedRetestSlugs.filter(s => s !== allergenStatus.allergenId)
                    : [...selectedRetestSlugs, allergenStatus.allergenId];
                }}
              >
                {cat.icon} {cat.name}
                {#if isChosen}<span class="ml-1">✓</span>{/if}
              </button>
            {/if}
          {/each}
        </div>
        {#if selectedRetestSlugs.length > 0}
          <Button onclick={addRetestPhases}>
            Přidat testovací fáze ({selectedRetestSlugs.length})
          </Button>
        {/if}
      </div>
    {/if}

    <!-- Edit notice -->
    <div class="text-center pt-2">
      <Button variant="ghost-sm" onclick={handleEditSchedule}>Upravit program</Button>
    </div>
  {/if}
</div>

{#if showToast}
  <Toast
    message={toastMessage}
    type={toastType}
    onUndo={toastUndo}
    onClose={() => { showToast = false; toastType = 'info'; toastUndo = undefined; }}
  />
{/if}

<style>
  .progress-ring-animated {
    transition: stroke-dashoffset 0.6s ease;
  }
</style>
