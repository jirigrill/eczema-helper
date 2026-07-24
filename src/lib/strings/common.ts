/**
 * App-wide UI chrome strings: page headers, toast messages, empty-state copy,
 * section labels, form errors, aria-labels, and any other presentational text
 * that is not a reusable button verb (those live in actions.ts) and is not
 * keyed by a domain identifier (those live in phases.ts / portions.ts / etc.).
 *
 * Strings that contain HTML markup (e.g. <strong>) are suffixed with `Html`
 * and must be rendered via {@html ...}. They are developer-defined constants
 * and therefore safe.
 *
 * Dynamic builders (strings that embed a runtime variable) are exported as
 * plain `const` functions below the main object.
 */
import type { AllergenOutcome, SkinEvaluationOutcome } from '$lib/domain/models';

export const commonStrings = {
  // ── Bottom navigation ──────────────────────────────────────
  nav: {
    addRecordAria: 'Přidat záznam',
    today: 'Dnes',
    week: 'Týden',
  },

  // ── FAB action sheet ──────────────────────────────────────
  fabSheet: {
    heading: 'Co chceš přidat?',
    addMeal: 'Přidat jídlo',
    addSkin: 'Zaznamenat stav kůže',
    cancel: 'Zrušit',
    /** Heading shown on the second-level meal-type submenu. */
    pickMealType: 'Jaké jídlo zaznamenáš?',
    /** Aria suffix appended to a submenu row when that slot is already logged. */
    alreadyLogged: 'již zaznamenáno',
    /** Contextual fourth row, shown only on a day that ends an evaluable phase (issue #331). */
    addEvaluation: 'Vyhodnotit test',
  },

  // ── Today page ────────────────────────────────────────────
  today: {
    heading: 'Dnes',
    settingsAria: 'Nastavení',
    noProgram: 'Program není nastaven. Dokončete dotazník.',
    programEnded: 'Program skončil',
    counterHint: 'Dnes ti chybí stav, foto a jídla.',
    phaseUntilPrefix: 'do',
    eczemaStatusLabel: 'Stav ekzému',
    eczemaStatusEmpty: 'Zatím není záznam pro dnešek — ',
    eczemaStatusEmptyCta: 'zaznamenat stav kůže',
    /**
     * Card-specific copy: the chip rendered on a SkinObservationCard row when
     * the observation has zero regions with `level > 0` (i.e. a klidné
     * observation per ADR-0021, klidné amendment). Lives in `common.today.*` rather than on
     * `severityStrings` because it's card-only copy with no equivalent
     * surface for levels 1–3 — the severity word `klidné` (lowercase) stays
     * unchanged for /skin tiles, /program recap, and /evaluation.
     */
    eczemaAllCalmChip: 'Vše klidné',
    photoLabel: 'Foto kůže',
    photoEmpty: 'Žádný snímek pro dnešek.',
    mealsLabel: 'Dnešní jídla',
    eczemaStatusValue: 'neuložen',
    photoStatusValue: 'chybí',
    mealsStatusValue: '0 záznamů',
    allowed: '✓ Smím',
    avoid: '✗ Vyhýbej se',
    noRestrictions: 'Žádná omezení',
    recordHint: 'Vše zapisuj přes + : foto · jídlo · stav',
    reminderLabel: 'Trénink tolerance',
    reminderNeverDosed: 'Ještě jsi nezkoušela.',
    reminderOverdue: 'Naposledy před',
  },

  // ── Future-day preview (read-only "Naplánováno" view) ────
  dayPreview: {
    /** Eyebrow / status badge on a future day. */
    badge: 'Naplánováno',
    /** Body copy explaining why the day is read-only. */
    description: 'Tento den teprve nastane. Záznamy můžeš přidat, až bude den aktuální.',
  },

  // ── Week page ─────────────────────────────────────────────
  week: {
    heading: 'Týden',
    overviewLabel: 'Přehled',
    comingSoon: 'Týdenní přehled bude dostupný v dalším slicu.',
  },

  // ── Settings page ─────────────────────────────────────────
  settings: {
    heading: 'Nastavení',
    resetWarning:
      'Restartování vymaže všechna uložená data (jídla, harmonogram, odpovědi) a vrátí tě na začátek dotazníku.',
    feedingStageHeading: 'Způsob krmení',
    feedingStageHint: 'Určuje, podle které varianty dávkovacího žebříčku se řídí znovuzavádění.',
  },

  // ── Onboarding questionnaire ───────────────────────────────
  onboarding: {
    heading: 'Průvodce eliminační dietou při atopickém ekzému',
    introLine1:
      'Pomůžeme vám sestavit osobní plán eliminační diety — co jíte vy jako kojící maminka ovlivňuje kůži miminka.',
    introLine2:
      'Budeme sledovat, co jíte, a porovnávat to s programem — abyste věděla, proč se kůže miminka mění.',
    whatsNext: 'Co vás čeká:',
    steps: [
      'Krátký dotazník (4 otázky)',
      'Osobní program vyloučení a znovuzavedení',
      'Denní záznamy jídel s upozorněním na odchylky',
    ] as string[],

    // Step 2 — Baby info
    step2Heading: 'Miminko',
    step2Subtitle: 'Datum narození a závažnost ekzému',
    birthdateLabel: 'Datum narození miminka',
    severityQuestion: 'Jak závažný je ekzém miminka?',
    severityHint: 'Závažnost ovlivní délku jednotlivých fází programu',
    severityOptions: {
      mild: { label: 'Mírná', desc: 'Občasné suché fleky, minimální svědění' },
      moderate: { label: 'Střední', desc: 'Časté zarudnutí, svědění narušuje spánek' },
      severe: { label: 'Těžká', desc: 'Rozsáhlý ekzém, silné svědění, možné krvácení' },
    },

    // Step 3 — Mother's allergies
    step3Heading: 'Moje alergie',
    step3Subtitle: 'Jsem alergická / mám intoleranci na:',
    step3InfoHtml:
      'Tyto potraviny budou <strong>trvale vyřazeny</strong> — neplánujeme je znovuzavodit, protože je samy nejíte. ' +
      'Přesto je budeme sledovat, abyste věděly o náhodném kontaktu.',

    // Step 4 — Baby's confirmed allergies
    step4Heading: 'Potvrzené alergie miminka',
    step4Subtitle: 'Má miminko potvrzenou alergii od lékaře?',
    step4InfoHtml:
      'Potvrzené alergeny budou po dobu diety <strong>vyřazeny</strong>. ' +
      'Jejich otestování a případné znovu zařazení by mělo proběhnout <strong>velmi opatrně</strong> či <strong>s lékařem</strong>.',

    // Step 5 — Program start date
    step5Heading: 'Začátek programu',
    step5Subtitle: 'Kdy chcete začít s eliminační dietou?',
    startDateLabel: 'Datum začátku',
    step5InfoHtml:
      'Program začne <strong>resetovací fází</strong> ({5} dní) — jezte normálně, ' +
      'zaznamenáváme výchozí stav kůže miminka. Poté přejdeme k eliminaci.',

    // Step 6 — Summary
    step6Heading: 'Shrnutí',
    step6Subtitle: 'Zkontrolujte odpovědi před spuštěním programu',
    summaryMotherLabel: 'Moje alergie',
    summaryBabyAllergiesLabel: 'Potvrzené alergie miminka',
    summaryBirthLabel: 'Narození',
    summarySeverityLabel: 'Závažnost',
    summaryStartEndLabel: 'Start · konec',
    summaryAge: 'Věk',
    summarySeverity: 'Závažnost',
    summaryStart: 'Začátek',
    summaryEdit: 'Upravit',
    summaryNoReintroHtml:
      '<em class="text-text-muted">Žádné znovuzavedení</em> — všechny protokolové alergeny jsou trvale vyřazeny',
    summaryReintroPrefix: 'Znovuzavedení',
    everyLabel: 'každý',
    noneLabel: 'žádné',
  },

  // ── Meal logging page ─────────────────────────────────────
  meal: {
    heading: 'Přidat jídlo',
    allCategoriesLabel: 'Všechny kategorie',
    customFoodPlaceholder: 'Název potraviny…',
    eliminatedChipLabel: 'Vyloučeno',
    eliminatedTodayWarning: '⚠️ Vyloučeno dnes',
    notesPlaceholder: 'Poznámka (volitelné, např. u babičky)',
    customFoodsLabel: 'Dříve zadané',
    customFamilyEmptyHint: 'Zatím žádné vlastní potraviny. Napište potravinu výše.',
    // ── Issue #244: modal-edit flow ────────────────────────
    confirmedFoodsLabel: 'Přidané potraviny',
    mealNotesLabel: 'Poznámka k jídlu',
    // ── Issue #247 / #277: dirty-aware discard toast (one per DiscardKind) ──
    /** Compose-new back-out: a fresh draft was discarded (neuter-singular). */
    discardedComposeToast: 'Jídlo neuloženo',
    /** Edit back-out, dirty: unsaved edits to a saved meal were dropped (feminine-plural "změny"). */
    discardedEditToast: 'Změny neuloženy',
    /** Explicit delete: the saved meal was removed; undo re-saves a fresh meal. */
    deletedToast: 'Jídlo smazáno',
    // ── Issue #268: explicit delete + empty-Hotovo guard ───
    deleteConfirmHeading: 'Smazat jídlo?',
    deleteConfirmBody: 'Toto jídlo bude odstraněno. Můžeš to vzít zpět hned po smazání.',
    emptyMealHint: 'Jídlo potřebuje aspoň jednu položku — pro odebrání použij Smazat.',
    /**
     * Passive, non-blocking hint shown when the edited meal's date falls
     * outside the current protocol's loggable window (issue #440) — e.g. a
     * schedule regeneration narrowed the span after the meal was logged.
     * Informational only: it never blocks saving.
     */
    outOfWindowHint: 'Toto jídlo je mimo okno aktuálního protokolu.',
  },

  // ── Program page ──────────────────────────────────────────
  program: {
    noProgram: 'Nejprve dokončete dotazník.',
    notStarted: 'Program ještě nezačal',
    startingPrefix: 'Začíná',
    completed: 'Program dokončen 🎉',
    completedBanner: 'Program dokončen!',

    // Section labels
    sectionTodo: 'Co dělat',
    sectionPermanent: 'Trvalá omezení',
    sectionPermanentNote: 'Těmto potravinám se vyhněte i nyní.',
    sectionPermanentReasonNote: 'Trvale vyřazeno z vašeho nebo miminkova důvodu.',
    sectionEliminated: 'Vyřazeno',
    sectionTesting: 'Testujete',
    sectionStillEliminated: 'Stále vyřazeno',
    sectionAllergenStatus: 'Stav alergenů',
    sectionDeviations: 'Odchylky v jídelníčku',
    sectionSkinReaction: 'Reakce kůže',
    sectionEvaluation: 'Celkové hodnocení',

    // Body copy
    evaluationPending: 'Hodnocení proběhne na konci fáze.',
    noDeviations: 'Žádné odchylky — vše v souladu s programem.',
    noSkinRecords: 'Žádné záznamy stavu kůže.',
    resetTodoHtml:
      'Jezte normálně — zaznamenáváme <strong>výchozí stav kůže</strong> miminka. ' +
      'Denně zaznamenejte stav kůže v přehledu dne.',
    eliminationTodoHtml:
      'Vylučte všechny níže uvedené alergeny — <strong>i ve skryté podobě</strong> ' +
      '(etikety, omáčky, pečivo). Čekáme na ustálení kůže miminka.',
    reintroAddPrefix: 'Zařaďte',
    reintroAddSuffix: 'do jídelníčku.',
    reintroTodayEval: 'Dnes vyhodnoťte celkovou reakci miminka.',
    reintroMonitor: 'Sledujte kůži miminka každý den.',
    toleranceBuildingPrefix: 'Budování tolerance — občas zařaďte malou dávku',
    toleranceBuildingSuffix: '(max 2× týdně, max 1 lžička). Budujete toleranci.',

    // Timeline
    now: 'Teď',
    ongoing: 'průběžně',

    // Permanent allergen sections
    motherAllergensSection: 'Maminčiny alergeny',
    motherAllergensNote: 'Trvale vyřazeno — vaše vlastní alergie.',
    babyAllergensSection: 'Potvrzené alergie miminka',
    babyAllergensNote: 'Trvale vyřazeno. Testování doporučujeme konzultovat s lékařem.',
    reactedAllergensSection: 'Alergeny s reakcí',
    reactedAllergensNote: 'Během testování reagovaly. Můžete je později znovu otestovat.',
    fromQuestionnaire: 'z dotazníku',
    trainingLabel: 'Trénink:',
    possibleCausePrefix: 'Možná příčina:',

    // Allergen status labels (keyed by AllergenStatusValue)
    statusLabels: {
      testing: 'testuje se',
      passed: '✓ znovuzavedena',
      reacted: 'reagovalo',
      'tolerance-building': 'buduje toleranci',
      eliminated: 'vyřazena',
      'not-yet-tested': 'vyřazena',
    } as Record<string, string>,

    // Skin assessment outcome labels
    skinOutcomes: {
      improved: 'Zlepšení',
      unchanged: 'Beze změny',
      worsened: 'Zhoršení',
      'new-lesions': 'Nová ložiska',
    } as Record<string, string>,

    // Reintroduction evaluation outcome labels
    reintroOutcomes: {
      tolerated: 'Toleruje',
      'mild-reaction': 'Mírná reakce',
      'clear-reaction': 'Jasná reakce',
      'severe-reaction': 'Silná reakce',
    } as Record<string, string>,

    // Toast messages (static)
    toastComingSoon: 'Tato funkce bude dostupná brzy',
    toastRetestCancelled: 'Retest zrušen.',
    toastCannotCancelProtocol: 'Nelze zrušit: toto je protokolová fáze, ne přidaný retest.',
    toastRetestNotFound: 'Retest nenalezen — možná již proběhl.',

    // Permanent elimination reason labels
    reasonMotherAndBaby: 'vaše + miminka',
    reasonMother: 'vaše alergie',
    reasonBaby: 'alergie miminka',
  },

  // ── Skin observation page (/skin) ──────────────────────────
  skin: {
    /** PageHeader title — "Stav kůže" matches the prototype. */
    heading: 'Stav kůže',
    /** Eyebrow above the region grid. */
    eyebrow: 'Kde a jak moc',
    /** Caption next to the eyebrow telling the mother the tap rule. */
    tapHint: 'ťukni = vyber · znovu = míra',
    /**
     * Optional per-observation note placeholder. Mirrors `/meal`'s editorial
     * pattern: `(volitelné, např. <concrete example>)` — the example teaches
     * the kind of observation worth keeping (a time-bound symptom that the
     * mother might not think to log on her own).
     */
    notePlaceholder: 'Poznámka (volitelné, např. svědí v noci)',
    /**
     * Save CTA label. Constant — does not change based on the number of
     * logged regions. The previous count-based label
     * (`Uložit stav · 1 oblast`) accidentally surfaced an implementation
     * detail: klidné (level 0) regions are excluded from the persisted
     * observation, so the count differed from the user's mental model
     * ("all nine regions were checked, not just one"). Using the domain
     * term `pozorování` reframes the action as "save what I observed"
     * rather than "save N specific areas", which sidesteps the leak. See
     * issue #379 for whether klidné should be persisted as positive
     * evidence.
     */
    saveLabel: 'Uložit pozorování',
    /** Aria label for the save action. */
    saveAriaLabel: 'Uložit pozorování kůže',
    /** Toast shown when persistence fails. */
    saveError: 'Uložení se nezdařilo. Zkus to znovu.',
    /** Toast shown when a delete fails after the mother confirms Smazat. */
    deleteError: 'Nepodařilo se smazat pozorování.',
    /** Prefix for the contextual photo-add button; region label is appended. */
    addPhotoPrefix: 'Přidat fotku · ',
    /**
     * CTA label in edit mode. Named the change rather than the observation
     * type so `Uložit změny` reads consistently across /meal and /skin.
     */
    updateLabel: 'Uložit změny',
    /** Aria label paired with `updateLabel`. */
    updateAriaLabel: 'Uložit změny pozorování',
    /**
     * Toast shown when a dirty edit is discarded via back-out. Silent on a
     * clean edit — nothing changed, so no message is warranted.
     */
    discardedEditToast: 'Změny neuloženy',
    /** Toast shown after an explicit delete (undo restores the observation). */
    deletedToast: 'Pozorování smazáno',
    /** Aria label for the undo action on a greyed-out persisted-photo tile. */
    undoPhotoRemoval: 'Vrátit snímek',
    // ── Issue #394: explicit delete + post-delete undo ────────
    /** Heading on the destructive-confirm sheet in edit mode. */
    deleteConfirmHeading: 'Smazat pozorování?',
    /** Body warning that photos will be removed alongside the observation. */
    deleteConfirmBody:
      'Pozorování i všechny jeho fotky budou odstraněny. Můžeš to vzít zpět hned po smazání.',
    /**
     * Passive, non-blocking hint shown when the edited observation's date
     * falls outside the current protocol's loggable window (issue #440) —
     * e.g. a schedule regeneration narrowed the span after the observation
     * was logged. Informational only: it never blocks saving.
     */
    outOfWindowHint: 'Toto pozorování je mimo okno aktuálního protokolu.',
  },

  // ── Evaluation page (/evaluation) ──────────────────────────
  evaluation: {
    heading: 'Vyhodnocení testu',
    recapHeading: 'Průběh testu',
    recapEmpty: 'Bez záznamu',
    outcomePrompt: 'Jak miminko alergen sneslo?',
    skinOutcomePrompt: 'Jak se kůže miminka měla?',
    notesPlaceholder: 'Poznámka (volitelné)',
    saveButton: 'Uložit vyhodnocení',
    saveButtonDisabled: 'Vyber výsledek',
    severeWarning:
      'Po silné reakci přijde 14denní odpočinek. Alergen není trvale vyřazen — později ho znovu otestuješ.',
    readonlyBadge: 'Vyhodnoceno',
    toastSaved: 'Vyhodnocení uloženo.',
    outcomeSubtitles: {
      tolerated: 'Žádná reakce',
      'mild-reaction': 'Zarudnutí, mírné svědění',
      'clear-reaction': 'Zhoršení po podání',
      'severe-reaction': 'Otok, dušnost — k lékaři',
    } satisfies Record<AllergenOutcome, string>,
    skinOutcomeSubtitles: {
      improved: 'Kůže se zklidnila',
      unchanged: 'Bez výrazné změny',
      worsened: 'Zhoršení během fáze',
      'new-lesions': 'Objevila se nová ložiska',
    } satisfies Record<SkinEvaluationOutcome, string>,
  },
} as const;

// ── Dynamic string builders ────────────────────────────────────────────────
// These cannot be `as const` literals because they embed runtime variables.

/** Czech pluralisation: days */
export function dnyCs(n: number): string {
  if (n === 1) return '1 den';
  if (n >= 2 && n <= 4) return `${n} dny`;
  return `${n} dní`;
}

/** Czech pluralisation: weeks */
export function tyzdnyCs(n: number): string {
  if (n === 1) return '1 týden';
  if (n <= 4) return `${n} týdny`;
  return `${n} týdnů`;
}

/** Czech pluralisation: months */
export function mesiceCs(n: number): string {
  if (n === 1) return '1 měsíc';
  if (n <= 4) return `${n} měsíce`;
  return `${n} měsíců`;
}

/** Czech pluralisation: allergen count word only (no number) */
export function allergenWordCs(n: number): string {
  if (n === 1) return 'alergen';
  if (n <= 4) return 'alergeny';
  return 'alergenů';
}

/** Czech pluralisation: meal item count word only (no number) */
export function polozkaWordCs(n: number): string {
  if (n === 1) return 'položka';
  if (n <= 4) return 'položky';
  return 'položek';
}

/** "Přidat testovací fáze (n)" */
export function addRetestPhasesLabel(n: number): string {
  return `Přidat testovací fáze (${n})`;
}

/** Czech pluralisation: skin observation count — "1 záznam", "2 záznamy", "5 záznamů" */
export function zaznamyCs(n: number): string {
  if (n === 1) return '1 záznam';
  if (n >= 2 && n <= 4) return `${n} záznamy`;
  return `${n} záznamů`;
}

/** Czech pluralisation: photo count — "1 snímek", "2 snímky", "5 snímků" */
export function snimkyCs(n: number): string {
  if (n === 1) return '1 snímek';
  if (n >= 2 && n <= 4) return `${n} snímky`;
  return `${n} snímků`;
}

/** "Pokračovat (n alergenů)" — onboarding continue with selection count */
export function continueWithCount(n: number): string {
  return `Pokračovat (${n} ${allergenWordCs(n)})`;
}

/** Toast: cannot add retest — allergen not a confirmed baby allergy */
export function toastRetestNotBabyConfirmed(names: string): string {
  return `Nelze přidat retest: ${names} není potvrzená alergie miminka.`;
}

/** Toast: cannot add retest — allergen already successfully cleared */
export function toastRetestAlreadyCleared(names: string): string {
  return `Nelze přidat retest: ${names} již bylo úspěšně otestováno.`;
}

/** Toast: retest for allergen already scheduled */
export function toastRetestAlreadyScheduled(names: string): string {
  return `Retest pro ${names} již je naplánován.`;
}

/** "Den {current} / {total}" — day progress counter in phase hero */
export function dayProgress(current: number, total: number): string {
  return `Den ${current} / ${total}`;
}

/** "den {current} z {total} · {date}" — compact phase progress with date */
export function phaseProgressLabel(current: number, total: number | null, date: string): string {
  return total != null ? `den ${current} z ${total} · ${date}` : `den ${current} · ${date}`;
}

/** "{count} fází · {formattedDate}" — program done-at line */
export function phasesDoneAt(count: number, formattedDate: string): string {
  return `${count} fází · ${formattedDate}`;
}

/** "{count} fází · celkem {days} dní" — end-of-program summary */
export function phasesCompletedSummary(count: number, days: number): string {
  return `${count} fází · celkem ${dnyCs(days)}`;
}

/** "{n} odchylek" — deviation count label */
export function deviationsCount(n: number): string {
  return `${n} odchylek`;
}

/** "…a dalších {n}" — truncated deviation list overflow */
export function deviationsMore(n: number): string {
  return `…a dalších ${n}`;
}

/** "🔬 Den {day} z {total}" — reintroduction day label in meal page */
export function reintroDayLabel(day: number, total: number): string {
  return `🔬 Den ${day} z ${total}`;
}
