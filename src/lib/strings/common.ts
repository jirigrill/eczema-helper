/**
 * App-wide UI chrome strings: page headers, toast messages, empty-state copy,
 * section labels, form errors, aria-labels, and any other presentational text
 * that is not a reusable button verb (those live in actions.ts) and is not
 * keyed by a domain identifier (those live in portions.ts / etc.).
 *
 * Strings that contain HTML markup (e.g. <strong>) are suffixed with `Html`
 * and must be rendered via {@html ...}. They are developer-defined constants
 * and therefore safe.
 *
 * Dynamic builders (strings that embed a runtime variable) are exported as
 * plain `const` functions below the main object.
 */
export const commonStrings = {
  // ── Global chrome ─────────────────────────────────────────
  nav: {
    addRecordAria: 'Přidat záznam',
    /** Header chip that jumps back to today's day view, shown only off-today (§3c). */
    backToToday: '↩ Dnes',
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
  },

  // ── Day view (home) ───────────────────────────────────────
  today: {
    heading: 'Dnes',
    settingsAria: 'Nastavení',
    eczemaStatusLabel: 'Stav ekzému',
    eczemaStatusEmpty: 'Zatím není záznam pro dnešek — ',
    eczemaStatusEmptyCta: 'zaznamenat stav kůže',
    /**
     * Card-specific copy: the chip rendered on a SkinObservationCard row when
     * the observation has zero regions with `level > 0` (i.e. a klidné
     * observation per ADR-0021, klidné amendment). Lives in `common.today.*` rather than on
     * `severityStrings` because it's card-only copy with no equivalent
     * surface for levels 1–3 — the severity word `klidné` (lowercase) stays
     * unchanged for /skin tiles.
     */
    eczemaAllCalmChip: 'Vše klidné',
    photoLabel: 'Foto kůže',
    photoEmpty: 'Žádný snímek pro dnešek.',
    mealsLabel: 'Dnešní jídla',
    recordHint: 'Vše zapisuj přes + : foto · jídlo · stav',
  },

  // ── Settings page ─────────────────────────────────────────
  settings: {
    heading: 'Nastavení',
    resetWarning: 'Restartování vymaže všechna uložená data a vrátí tě na začátek.',
    /** Heading on the destructive-confirm sheet guarding the factory reset. */
    resetConfirmHeading: 'Opravdu restartovat?',
    /**
     * Body naming exactly what the wipe destroys. Reset clears every table, so
     * the copy must name the photos — they are irreversible and, with no export
     * yet (#438), this device holds the only copy.
     */
    resetConfirmBody:
      'Všechna jídla, pozorování i fotky budou trvale smazány. Tuto akci nelze vzít zpět.',
    feedingStageHeading: 'Způsob krmení',
    feedingStageHint: 'Určuje, čí jídla můžeš zaznamenávat.',
  },

  // ── First-run screen (single welcome + feeding-stage picker) ─
  firstRun: {
    heading: 'Vítejte',
    intro: 'Jednoduchý deník jídel a stavu kůže. Než začnete, řekněte nám, jak je miminko krmené.',
    feedingStageQuestion: 'Jak je miminko krmené?',
    /** Reused from onboarding — accurate for the logging app (§3c). */
    feedingStageHint: 'Určuje, čí jídla zaznamenáváte — dá se změnit později v Nastavení',
    confirm: 'Začít',
    saveError: 'Uložení se nezdařilo, zkuste to prosím znovu.',
  },

  // ── Meal logging page ─────────────────────────────────────
  meal: {
    heading: 'Přidat jídlo',
    allCategoriesLabel: 'Všechny kategorie',
    customFoodPlaceholder: 'Název potraviny…',
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
    // ── Issue #268: explicit delete; empty-meal delete (repurposed #588) ───
    deleteConfirmHeading: 'Smazat jídlo?',
    deleteConfirmBody: 'Toto jídlo bude odstraněno. Můžeš to vzít zpět hned po smazání.',
    // Emptying an existing meal deletes it (#588, reverses #586's no-op guard):
    // the hint warns that saving/leaving an emptied edit removes the meal.
    emptyMealHint: 'Jídlo je prázdné — uložením ho smažeš.',
    // ── Copy meal (spec #599) ──────────────────────────────────
    /** Heading of the copy-destination picker. */
    copyPickerHeading: 'Kam zkopírovat?',
    /** Success toast after a copy lands on the destination day (undoable). */
    copiedToast: 'Zkopírováno',
    /**
     * Error toast when a copy fails to save — a Dexie quota or transaction
     * error. The loggable-window gate is gone (§3e), so this is a generic
     * save-failure message.
     */
    copyFailedToast: 'Kopírování se nezdařilo, zkuste to prosím znovu.',
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
  },
} as const;

// ── Dynamic string builders ────────────────────────────────────────────────
// These cannot be `as const` literals because they embed runtime variables.

/** Czech pluralisation: meal item count word only (no number) */
export function polozkaWordCs(n: number): string {
  if (n === 1) return 'položka';
  if (n <= 4) return 'položky';
  return 'položek';
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
