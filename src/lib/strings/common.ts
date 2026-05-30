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
export const commonStrings = {

  // ── Bottom navigation ──────────────────────────────────────
  nav: {
    addRecordAria: 'Přidat záznam',
    today:         'Dnes',
    week:          'Týden',
  },

  // ── Today page ────────────────────────────────────────────
  today: {
    heading:           'Dnes',
    settingsAria:      'Nastavení',
    noProgram:         'Program není nastaven. Dokončete dotazník.',
    programEnded:      'Program skončil',
    counterHint:       'Dnes ti chybí stav, foto a jídla.',
    eczemaStatusLabel: 'Stav ekzému',
    eczemaStatusEmpty: 'Zatím není záznam pro dnešek.',
    photoLabel:        'Foto kůže',
    photoEmpty:        'Žádný snímek pro dnešek.',
    mealsLabel:        'Dnešní jídla',
    mealsEmpty:        'Zatím žádný záznam.',
    eczemaStatusValue: 'neuložen',
    photoStatusValue:  'chybí',
    mealsStatusValue:  '0 záznamů',
    allowed:           '✓ Smím',
    avoid:             '✗ Vyhýbej se',
    noRestrictions:    'Žádná omezení',
    recordHint:        'Vše zapisuj přes + : foto · jídlo · stav',
    statusCounts:      '0 / 3',
  },

  // ── Week page ─────────────────────────────────────────────
  week: {
    heading:      'Týden',
    overviewLabel: 'Přehled',
    comingSoon:   'Týdenní přehled bude dostupný v dalším slicu.',
  },

  // ── Settings page ─────────────────────────────────────────
  settings: {
    heading:          'Nastavení',
    prototypeHeading: 'Nastavení prototypu',
    prototypeSubtitle:'Souhrn aktuální konfigurace a možnost restartu',
    currentConfig:    'Aktuální konfigurace',
    noAnswers:        'Dotazník ještě nebyl vyplněn.',
    programLabel:     'Program',
    mealsCountHtml:   'Zapsáno jídel: <strong>0</strong>',
    resetWarning:     'Restartování vymaže všechna uložená data (jídla, harmonogram, odpovědi) a vrátí tě na začátek dotazníku.',
    noneLabel:        'žádné',
    severityLabel: {
      mild:     'Mírná',
      moderate: 'Střední',
      severe:   'Těžká',
    } as Record<string, string>,
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
    step2Heading:     'Miminko',
    step2Subtitle:    'Datum narození a závažnost ekzému',
    birthdateLabel:   'Datum narození miminka',
    severityQuestion: 'Jak závažný je ekzém miminka?',
    severityHint:     'Závažnost ovlivní délku jednotlivých fází programu',
    severityOptions: {
      mild:     { label: 'Mírná',   desc: 'Občasné suché fleky, minimální svědění' },
      moderate: { label: 'Střední', desc: 'Časté zarudnutí, svědění narušuje spánek' },
      severe:   { label: 'Těžká',   desc: 'Rozsáhlý ekzém, silné svědění, možné krvácení' },
    },

    // Step 3 — Mother's allergies
    step3Heading:  'Moje alergie',
    step3Subtitle: 'Jsem alergická / mám intoleranci na:',
    step3InfoHtml:
      'Tyto potraviny budou <strong>trvale vyřazeny</strong> — neplánujeme je znovuzavodit, protože je samy nejíte. ' +
      'Přesto je budeme sledovat, abyste věděly o náhodném kontaktu.',

    // Step 4 — Baby's confirmed allergies
    step4Heading:  'Potvrzené alergie miminka',
    step4Subtitle: 'Má miminko potvrzenou alergii od lékaře?',
    step4InfoHtml:
      'Potvrzené alergeny budou po dobu diety <strong>vyřazeny</strong>. ' +
      'Jejich otestování a případné znovu zařazení by mělo proběhnout <strong>velmi opatrně</strong> či <strong>s lékařem</strong>.',

    // Step 5 — Program start date
    step5Heading:   'Začátek programu',
    step5Subtitle:  'Kdy chcete začít s eliminační dietou?',
    startDateLabel: 'Datum začátku',
    step5InfoHtml:
      'Program začne <strong>resetovací fází</strong> ({5} dní) — jezte normálně, ' +
      'zaznamenáváme výchozí stav kůže miminka. Poté přejdeme k eliminaci.',

    // Step 6 — Summary
    step6Heading:      'Shrnutí',
    step6Subtitle:     'Zkontrolujte odpovědi před spuštěním programu',
    summaryBabyLabel:         'Miminko',
    summaryMotherLabel:       'Moje alergie',
    summaryBabyAllergiesLabel:'Potvrzené alergie miminka',
    summaryAge:        'Věk',
    summarySeverity:   'Závažnost',
    summaryStart:      'Začátek',
    summaryEdit:       'Upravit',
    summaryNoReintroHtml:
      '<em class="text-text-muted">Žádné znovuzavedení</em> — všechny protokolové alergeny jsou trvale vyřazeny',
    summaryReintroPrefix: 'Znovuzavedení',
    everyLabel:           'každý',
  },

  // ── Meal logging page ─────────────────────────────────────
  meal: {
    heading:              'Přidat jídlo',
    todayExcluded:        'Dnes vyřazeno:',
    mealTypeLabel:        'Typ jídla',
    allergenCategoryLabel:'Alergeny a kategorie',
    allCategoriesLabel:   'Všechny kategorie',
    customFoodLabel:      'Přidat vlastní potravinu',
    customFoodPlaceholder:'Název potraviny…',
    conflictTitle:        '⚠ Odchylka od programu',
    conflictNote:         'tyto potraviny jsou dnes vyřazeny.',
    conflictSaveNote:     'Jídlo bude uloženo a odchylka zaznamenána.',
    todaySavedLabel:      'Dnes uložená jídla',
    mealSavedToast:       '✓ Jídlo uloženo',
    // ── Basket (slice 2c) ──────────────────────────────────
    inThisMealLabel:      'V tomto jídle',
    basketEmptyHint:      'Zatím prázdné. Klepni na potravinu výše.',
    conflictItemLabel:    'vyřazeno',
    eliminatedChipLabel:  'Vyloučeno',
    notesLabelPrefix:     'Poznámka k',
    notesPlaceholder:     'Poznámka (volitelné, např. u babičky)',
  },

  // ── Program page ──────────────────────────────────────────
  program: {
    noProgram:         'Nejprve dokončete dotazník.',
    notStarted:        'Program ještě nezačal',
    startingPrefix:    'Začíná',
    completed:         'Program dokončen 🎉',
    completedBanner:   'Program dokončen!',

    // Section labels
    sectionTodo:                'Co dělat',
    sectionPermanent:           'Trvalá omezení',
    sectionPermanentNote:       'Těmto potravinám se vyhněte i nyní.',
    sectionPermanentReasonNote: 'Trvale vyřazeno z vašeho nebo miminkova důvodu.',
    sectionEliminated:          'Vyřazeno',
    sectionTesting:             'Testujete',
    sectionStillEliminated:     'Stále vyřazeno',
    sectionAllergenStatus:      'Stav alergenů',
    sectionDeviations:          'Odchylky v jídelníčku',
    sectionSkinReaction:        'Reakce kůže',
    sectionEvaluation:          'Celkové hodnocení',

    // Body copy
    evaluationPending: 'Hodnocení proběhne na konci fáze.',
    noDeviations:      'Žádné odchylky — vše v souladu s programem.',
    noSkinRecords:     'Žádné záznamy stavu kůže.',
    resetTodoHtml:
      'Jezte normálně — zaznamenáváme <strong>výchozí stav kůže</strong> miminka. ' +
      'Denně zaznamenejte stav kůže v přehledu dne.',
    eliminationTodoHtml:
      'Vylučte všechny níže uvedené alergeny — <strong>i ve skryté podobě</strong> ' +
      '(etikety, omáčky, pečivo). Čekáme na ustálení kůže miminka.',
    reintroAddPrefix:    'Zařaďte',
    reintroAddSuffix:    'do jídelníčku.',
    reintroTodayEval:    'Dnes vyhodnoťte celkovou reakci miminka.',
    reintroMonitor:      'Sledujte kůži miminka každý den.',
    toleranceBuildingPrefix: 'Budování tolerance — občas zařaďte malou dávku',
    toleranceBuildingSuffix: '(max 2× týdně, max 1 lžička). Budujete toleranci.',

    // Timeline
    now:      'Teď',
    ongoing:  'průběžně',

    // Permanent allergen sections
    motherAllergensSection:  'Maminčiny alergeny',
    motherAllergensNote:     'Trvale vyřazeno — vaše vlastní alergie.',
    babyAllergensSection:    'Potvrzené alergie miminka',
    babyAllergensNote:       'Trvale vyřazeno. Testování doporučujeme konzultovat s lékařem.',
    fromQuestionnaire:       'z dotazníku',
    trainingLabel:           'Trénink:',
    possibleCausePrefix:     'Možná příčina:',

    // Allergen status labels (keyed by AllergenStatusValue)
    statusLabels: {
      testing:             'testuje se',
      passed:              '✓ znovuzavedena',
      reacted:             'reagovalo',
      'tolerance-building':'buduje toleranci',
      eliminated:          'vyřazena',
      'not-yet-tested':    'vyřazena',
    } as Record<string, string>,

    // Skin assessment outcome labels
    skinOutcomes: {
      improved:     'Zlepšení',
      unchanged:    'Beze změny',
      worsened:     'Zhoršení',
      'new-lesions':'Nová ložiska',
    } as Record<string, string>,

    // Skin assessment count suffixes (e.g. "3× zlepšení")
    skinImprovedSuffix:   '× zlepšení',
    skinUnchangedSuffix:  '× beze změny',
    skinWorsenedSuffix:   '× zhoršení',
    skinNewLesionsSuffix: '× nová ložiska',

    // Reintroduction evaluation outcome labels
    reintroOutcomes: {
      tolerated:       'Toleruje',
      'mild-reaction': 'Mírná reakce',
      'clear-reaction':'Jasná reakce',
      'strong-reaction':'Silná reakce',
    } as Record<string, string>,

    // Toast messages (static)
    toastComingSoon:           'Tato funkce bude dostupná brzy',
    toastRetestCancelled:      'Retest zrušen.',
    toastCannotCancelProtocol: 'Nelze zrušit: toto je protokolová fáze, ne přidaný retest.',
    toastRetestNotFound:       'Retest nenalezen — možná již proběhl.',

    // Permanent elimination reason labels
    reasonMotherAndBaby: 'vaše + miminka',
    reasonMother:        'vaše alergie',
    reasonBaby:          'alergie miminka',
  },

  // ── Skin observation page ─────────────────────────────────
  skin: {
    heading: 'Záznam stavu kůže',
  },

  // ── EczemaCheck component ──────────────────────────────────
  eczemaCheck: {
    heading:             'Stav kůže miminka',
    savedLabel:          '✓ Uloženo',
    reactionInstruction: 'Zaznamenejte jakékoliv změny kůže po zavedení tohoto alergenu.',
    notePlaceholder:     'Poznámka (volitelné) — např. zarudnutí na tváři…',
  },

  // ── CategoryGrid component ─────────────────────────────────
  categoryGrid: {
    yourAllergyLabel:     'vaše alergie',
    partialLabel:         'část',
    customAllergenHeading:'Vlastní alergen',
    customPlaceholder:    'Např. Cibule, Mrkev…',
    removeAriaLabel:      'Odebrat',
  },

} as const;

// ── Dynamic string builders ────────────────────────────────────────────────
// These cannot be `as const` literals because they embed runtime variables.

/** Czech pluralisation: days */
export function dnyCs(n: number): string {
  if (n === 1) return '1 den';
  if (n <= 4) return `${n} dny`;
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

/** "Pokračovat (n alergenů)" — onboarding continue with selection count */
export function continueWithCount(n: number): string {
  return `Pokračovat (${n} ${allergenWordCs(n)})`;
}

/** Conflict toast: shown briefly when a food item with an eliminated allergen is added to the basket */
export function conflictToastCs(allergenName: string): string {
  return `⚠ ${allergenName} vyřazeno — odchylka zaznamenána`;
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
  return total != null
    ? `den ${current} z ${total} · ${date}`
    : `den ${current} · ${date}`;
}

/** "Celkem {count} fází · do {formattedDate}" — settings schedule summary */
export function schedulePhaseSummary(count: number, formattedDate: string): string {
  return `Celkem ${count} fází · do ${formattedDate}`;
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
