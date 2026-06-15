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
  /** Meal logging modal-edit flow (issue #244) */
  saveFood:          'Uložit',         // callers append ' {foodName}'
  saveFamily:        'Uložit rodinu',  // generic fallback; callers can append family name

  /** Meal delete + overflow (issue #268, ADR-0018) */
  more:              'Více',            // aria-label for the ⋯ overflow trigger
  deleteMeal:        'Smazat jídlo',    // destructive button on the confirm sheet
  confirmDelete:     'Potvrdit smazání', // future-proof; not currently rendered (deleteMeal is itself the confirm verb)

} as const;
