/**
 * Reusable button / action labels for the entire app.
 *
 * Rule: if a string is a verb or short phrase that appears on a tappable element
 * (button, link-button, aria-label for an icon-only action), it belongs here.
 * Everything else (headers, toasts, empty states, section labels) belongs in
 * common.ts.
 */
export const actionStrings = {
  /** Generic verbs */
  start:              'Začít',
  continue:           'Pokračovat',
  back:               'Zpět',
  backArrow:          '← Zpět',
  add:                'Přidat',
  save:               'Uložit',
  /**
   * Edit-mode finalize CTA on `/meal` (issue #277, ADR-0018). Distinct from
   * `save` because compose-new reads "Uložit {MealType}" (e.g. "Uložit Oběd")
   * — naming the artifact being created — while edit-update reads
   * "Uložit změny" — naming the *change*, never the meal type, so the user
   * never fears creating a duplicate lunch.
   */
  saveChanges:        'Uložit změny',
  cancel:             'Zrušit',
  close:              'Zavřít',
  done:               'Hotovo',
  all:                'Vše',
  edit:               'Upravit',

  /** Compound / app-specific action labels */
  confirm:            'Potvrdit a spustit program',
  restart:            'Restartovat dotazník',
  saveWithConflict:   '⚠ Uložit s odchylkou',
  editSchedule:       'Upravit program',

  /** Onboarding skip / no-selection buttons */
  noAllergy:          'Nemám žádnou alergii',
  noConfirmedAllergy: 'Žádné potvrzené alergie',

  /** Navigation links styled as actions */
  evaluatePhase:      'Zhodnotit fázi →',
  startQuestionnaire: 'Spustit dotazník →',
  showDayOverview:    'Zobrazit přehled dne →',

  /** EczemaCheck / assessment flow */
  saveAssessment:     'Uložit hodnocení',
  savedAssessment:    '✓ Uloženo',
  addPhoto:           'Přidat fotku',
  photoTaken:         'Fotka pořízena',

  /** Meal delete + overflow (issue #268, ADR-0018) */
  more:              'Více',            // aria-label for the ⋯ overflow trigger
  deleteMeal:        'Smazat jídlo',    // destructive button on the confirm sheet
  confirmDelete:     'Potvrdit smazání', // future-proof; not currently rendered (deleteMeal is itself the confirm verb)

} as const;
