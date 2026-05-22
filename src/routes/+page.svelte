<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Onboarding Questionnaire (5 steps)
  // ═══════════════════════════════════════════════════════════
  import { goto } from '$app/navigation';
  import CategoryGrid from '$lib/components/CategoryGrid.svelte';
  import FormInput from '$lib/components/form-input.svelte';
  import ErrorAlert from '$lib/components/error-alert.svelte';
  import InfoBanner from '$lib/components/InfoBanner.svelte';
  import SummaryCard from '$lib/components/SummaryCard.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Button from '$lib/components/Button.svelte';
  import { generateSchedule } from '$lib/domain/schedule-builder';
  import type { EczemaSeverity, QuestionnaireAnswers } from '$lib/domain/models';
  import { getCategoryById, DEFAULT_TESTED_ALLERGENS } from '$lib/data/categories';
  import { formatDateLongCs } from '$lib/utils/date';
  import { db } from '$lib/db/atopic-db';
  import { DexieQuestionnaireRepository } from '$lib/adapters/dexie-questionnaire-repository';
  import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';

  const questionnaireRepo = new DexieQuestionnaireRepository(db);
  const scheduleRepo = new DexieScheduleRepository(db);

  // ── Form state ────────────────────────────────────────────
  let step = $state(1);
  const TOTAL_STEPS = 6;

  let babyBirthDate = $state('');
  let severity = $state<EczemaSeverity>('moderate');
  let motherAllergies = $state<string[]>([]);
  let babyAllergies = $state<string[]>([]);
  let programStartDate = $state(new Date().toISOString().split('T')[0]);

  const progress = $derived(((step - 1) / (TOTAL_STEPS - 1)) * 100);

  const permanentSlugs = $derived(
    [...new Set([...motherAllergies.map(s => s.split(':')[0]), ...babyAllergies.map(s => s.split(':')[0])])]
  );
  const reintroQueue = $derived(DEFAULT_TESTED_ALLERGENS.filter(s => !permanentSlugs.includes(s)));
  const elimDays = $derived(severity === 'severe' ? 21 : 14);
  const reintroDays = 4;

  // ── Severity options ──────────────────────────────────────
  const severityOptions: { value: EczemaSeverity; label: string; desc: string; border: string; bg: string }[] = [
    { value: 'mild', label: 'Mírná', desc: 'Občasné suché fleky, minimální svědění', border: 'border-l-4 border-success', bg: 'bg-success/5' },
    { value: 'moderate', label: 'Střední', desc: 'Časté zarudnutí, svědění narušuje spánek', border: 'border-l-4 border-warning', bg: 'bg-warning/5' },
    { value: 'severe', label: 'Těžká', desc: 'Rozsáhlý ekzém, silné svědění, možné krvácení', border: 'border-l-4 border-danger', bg: 'bg-danger/5' },
  ];

  // ── Navigation ────────────────────────────────────────────
  let returnToSummary = $state(false);
  let saveError = $state<string | null>(null);

  function next() {
    if (returnToSummary) {
      step = TOTAL_STEPS;
      returnToSummary = false;
      return;
    }
    if (step < TOTAL_STEPS) step++;
  }

  function back() {
    if (step > 1) step--;
  }

  function editStep(n: number) {
    returnToSummary = true;
    step = n;
  }

  function canAdvance(): boolean {
    if (step === 2) return !!babyBirthDate;
    return true;
  }

  // ── Save & proceed ────────────────────────────────────────
  async function confirm() {
    saveError = null;
    const answers: QuestionnaireAnswers = $state.snapshot({
      babyBirthDate,
      eczemaSeverity: severity,
      motherAllergies,
      babyConfirmedAllergies: babyAllergies,
      programStartDate,
      completedAt: new Date().toISOString(),
      testedAllergens: DEFAULT_TESTED_ALLERGENS,
    });
    const schedule = generateSchedule(answers);
    const saveAnswers = await questionnaireRepo.save(answers);
    if (!saveAnswers.ok) { saveError = saveAnswers.error; return; }
    const saveSchedule = await scheduleRepo.save(schedule);
    if (!saveSchedule.ok) { saveError = saveSchedule.error; return; }
    goto('/today');
  }

  // ── Summary helpers ───────────────────────────────────────
  function formatBabyAge(): string {
    if (!babyBirthDate) return '—';
    const birth = new Date(babyBirthDate + 'T00:00:00');
    const now = new Date();
    const weeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86400000));
    if (weeks < 8) {
      if (weeks === 1) return '1 týden';
      if (weeks <= 4) return `${weeks} týdny`;
      return `${weeks} týdnů`;
    }
    const months = Math.floor(weeks / 4.33);
    if (months === 1) return '1 měsíc';
    if (months <= 4) return `${months} měsíce`;
    return `${months} měsíců`;
  }

  // Count unique allergen categories (not individual sub-item slugs).
  // Custom slugs (other:Name) each count as their own entry — not collapsed.
  function affectedCategoryCount(slugs: string[]): number {
    return new Set(slugs.map(s => s.startsWith('other:') ? s : s.split(':')[0])).size;
  }

  function slugsToNames(slugs: string[]): string {
    if (slugs.length === 0) return 'žádné';
    return slugs.map(s => {
      if (s.startsWith('other:')) return s.slice(6);
      if (s.includes(':')) {
        const cat = getCategoryById(s.split(':')[0]);
        const sub = cat?.subItems.find(i => i.subitemId === s);
        return sub?.nameCs ?? s.split(':')[1];
      }
      return getCategoryById(s)?.nameCs ?? s;
    }).join(', ');
  }
</script>

<div class="min-h-screen bg-surface flex flex-col">
  <!-- Progress bar -->
  {#if step > 1 && step < TOTAL_STEPS}
    <ProgressBar value={progress} />
  {/if}

  <!-- Back button -->
  {#if step > 1}
    <button
      class="self-start m-4 mb-0 body-muted flex items-center gap-1 hover:text-text"
      onclick={back}
    >
      ← Zpět
    </button>
  {/if}

  <div class="flex-1 flex flex-col w-full page-container pb-8">

    <!-- ═══ Step 1: Welcome ═══ -->
    {#if step === 1}
      <div class="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div class="text-7xl">🌿</div>
        <div>
          <h1 class="text-2xl font-bold text-text mb-3">Průvodce eliminační dietou při atopickém ekzému</h1>
          <p class="text-text-muted leading-relaxed">
            Pomůžeme vám sestavit osobní plán eliminační diety — co jíte vy jako kojící maminka ovlivňuje kůži miminka.
            Budeme sledovat, co jíte, a porovnávat to s programem — abyste věděla, proč se kůže miminka mění.
          </p>
        </div>
        <div class="card-base w-full text-left space-y-2">
          <p class="text-sm font-medium text-text">Co vás čeká:</p>
          {#each ['Krátký dotazník (4 otázky)', 'Osobní program vyloučení a znovuzavedení', 'Denní záznamy jídel s upozorněním na odchylky'] as item}
            <div class="flex items-start gap-2 body-muted">
              <span class="text-success mt-0.5">✓</span>
              <span>{item}</span>
            </div>
          {/each}
        </div>
        <Button onclick={next}>Začít</Button>
      </div>

    <!-- ═══ Step 2: Baby info ═══ -->
    {:else if step === 2}
      <div class="flex-1 flex flex-col justify-center gap-6">
        <div>
          <h2 class="text-xl font-bold text-text mb-1">Miminko</h2>
          <p class="body-muted">Datum narození a závažnost ekzému</p>
        </div>

        <FormInput
          id="birthdate"
          label="Datum narození miminka"
          type="date"
          bind:value={babyBirthDate}
          max={new Date().toISOString().split('T')[0]}
        />

        <div>
          <p class="text-sm font-medium text-text mb-3">Jak závažný je ekzém miminka?</p>
          <div class="space-y-3">
            {#each severityOptions as opt}
              <button
                type="button"
                class="w-full text-left rounded-xl border-2 p-4 transition-all
                  {severity === opt.value ? opt.border + ' ' + opt.bg + ' shadow-sm' : 'border-surface-dark bg-white'}"
                onclick={() => (severity = opt.value)}
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-semibold text-text">{opt.label}</p>
                    <p class="body-muted mt-0.5">{opt.desc}</p>
                  </div>
                  {#if severity === opt.value}
                    <span class="text-primary text-xl">●</span>
                  {:else}
                    <span class="text-surface-dark text-xl">○</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>

        <div class="mt-auto">
          <p class="text-xs text-text-muted mb-1 text-center">
            Závažnost ovlivní délku jednotlivých fází programu
          </p>
          <Button onclick={next} disabled={!canAdvance()}>Pokračovat</Button>
        </div>
      </div>

    <!-- ═══ Step 3: Mother's allergies ═══ -->
    {:else if step === 3}
      <div class="flex-1 flex flex-col gap-5">
        <div>
          <h2 class="text-xl font-bold text-text mb-1">Moje alergie</h2>
          <p class="body-muted">
            Jsem alergická / mám intoleranci na:
          </p>
        </div>

        <InfoBanner variant="info">
          <p class="body">
            Tyto potraviny budou <strong>trvale vyřazeny</strong> — neplánujeme je znovuzavodit, protože je samy nejíte.
            Přesto je budeme sledovat, abyste věděly o náhodném kontaktu.
          </p>
        </InfoBanner>

        <CategoryGrid bind:selected={motherAllergies} variant="primary" expandable={true} />

        <div class="mt-auto space-y-2">
          <Button onclick={next}>
            {motherAllergies.length > 0 ? `Pokračovat (${affectedCategoryCount(motherAllergies)} ${affectedCategoryCount(motherAllergies) === 1 ? 'alergen' : affectedCategoryCount(motherAllergies) <= 4 ? 'alergeny' : 'alergenů'})` : 'Pokračovat'}
          </Button>
          {#if motherAllergies.length === 0}
            <button class="w-full py-2 body-muted" onclick={next}>
              Nemám žádnou alergii
            </button>
          {/if}
        </div>
      </div>

    <!-- ═══ Step 4: Baby's confirmed allergies ═══ -->
    {:else if step === 4}
      <div class="flex-1 flex flex-col gap-5">
        <div>
          <h2 class="text-xl font-bold text-text mb-1">Potvrzené alergie miminka</h2>
          <p class="body-muted">
            Má miminko potvrzenou alergii od lékaře?
          </p>
        </div>

        <InfoBanner variant="danger">
          <p class="body">
            Potvrzené alergeny budou po dobu diety <strong>vyřazeny</strong>.
            Jejich otestování a případné znovu zařazení by mělo proběhnout <strong>velmi opatrně</strong> či <strong>s lékařem</strong>.
          </p>
        </InfoBanner>

        <CategoryGrid
          bind:selected={babyAllergies}
          variant="danger"
          expandable={true}
        />

        <div class="mt-auto space-y-2">
          <Button onclick={next}>
            {babyAllergies.length > 0 ? `Pokračovat (${affectedCategoryCount(babyAllergies)} ${affectedCategoryCount(babyAllergies) === 1 ? 'alergen' : affectedCategoryCount(babyAllergies) <= 4 ? 'alergeny' : 'alergenů'})` : 'Pokračovat'}
          </Button>
          {#if babyAllergies.length === 0}
            <button class="w-full py-2 body-muted" onclick={next}>
              Žádné potvrzené alergie
            </button>
          {/if}
        </div>
      </div>

    <!-- ═══ Step 5: Program start date ═══ -->
    {:else if step === 5}
      <div class="flex-1 flex flex-col justify-center gap-6">
        <div>
          <h2 class="text-xl font-bold text-text mb-1">Začátek programu</h2>
          <p class="body-muted">Kdy chcete začít s eliminační dietou?</p>
        </div>

        <FormInput
          id="startdate"
          label="Datum začátku"
          type="date"
          bind:value={programStartDate}
          min={new Date().toISOString().split('T')[0]}
        />

        <InfoBanner variant="info">
          <p class="body leading-relaxed">
            Program začne <strong>resetovací fází</strong> ({5} dní) — jezte normálně,
            zaznamenáváme výchozí stav kůže miminka. Poté přejdeme k eliminaci.
          </p>
        </InfoBanner>

        <div class="mt-auto">
          <Button onclick={next}>Pokračovat</Button>
        </div>
      </div>

    <!-- ═══ Step 6: Summary ═══ -->
    {:else if step === 6}
      <div class="flex-1 flex flex-col gap-5">
        <div>
          <h2 class="text-xl font-bold text-text mb-1">Shrnutí</h2>
          <p class="body-muted">Zkontrolujte odpovědi před spuštěním programu</p>
        </div>

        <!-- Summary cards -->
        <div class="space-y-3">
          <SummaryCard label="Miminko" onEdit={() => editStep(2)}>
            <p class="body">Věk: <strong>{formatBabyAge()}</strong></p>
            <p class="body mt-0.5">
              Závažnost: <strong>{severityOptions.find(s => s.value === severity)?.label}</strong>
            </p>
          </SummaryCard>

          <SummaryCard label="Moje alergie" onEdit={() => editStep(3)}>
            <p class="body">{slugsToNames(motherAllergies)}</p>
          </SummaryCard>

          <SummaryCard label="Potvrzené alergie miminka" onEdit={() => editStep(4)}>
            <p class="body">{slugsToNames(babyAllergies)}</p>
          </SummaryCard>

          <InfoBanner variant="info">
            <div class="flex items-center justify-between mb-2">
              <p class="section-label text-primary mb-0">Program</p>
              <button class="text-xs text-primary" onclick={() => editStep(5)}>Upravit</button>
            </div>
            <p class="body mb-2">Začátek: <strong>{formatDateLongCs(programStartDate)}</strong></p>
            <div class="body space-y-1">
              <p>✦ <strong>5 dní</strong> resetovací fáze</p>
              <p>✦ <strong>{elimDays} dní</strong> eliminační fáze</p>
              {#if reintroQueue.length > 0}
                <p>✦ Znovuzavedení (<strong>{reintroDays} dní</strong> každý):
                  {reintroQueue.map(s => getCategoryById(s)?.nameCs ?? s).join(' → ')}
                </p>
              {:else}
                <p>✦ <em class="text-text-muted">Žádné znovuzavedení</em> — všechny protokolové alergeny jsou trvale vyřazeny</p>
              {/if}
            </div>
          </InfoBanner>
        </div>

        <div class="mt-auto">
          {#if saveError}
            <ErrorAlert message={saveError} />
          {/if}
          <Button onclick={confirm}>Potvrdit a spustit program</Button>
        </div>
      </div>
    {/if}

  </div>
</div>
