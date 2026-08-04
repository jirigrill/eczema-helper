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
  start: 'Začít',
  continue: 'Pokračovat',
  back: 'Zpět',
  add: 'Přidat',
  save: 'Uložit',
  /**
   * Edit-mode finalize CTA on `/meal` (issue #277, ADR-0018). Distinct from
   * `save` because compose-new reads "Uložit {MealType}" (e.g. "Uložit Oběd")
   * — naming the artifact being created — while edit-update reads
   * "Uložit změny" — naming the *change*, never the meal type, so the user
   * never fears creating a duplicate lunch.
   */
  saveChanges: 'Uložit změny',
  cancel: 'Zrušit',
  close: 'Zavřít',
  done: 'Hotovo',
  edit: 'Upravit',
  /** Destructive "start over" button on Settings — clears data and returns to first run (§3d). */
  reset: 'Restartovat',

  /** Meal delete + overflow (issue #268, ADR-0018) */
  more: 'Více', // aria-label for the ⋯ overflow trigger
  deleteMeal: 'Smazat jídlo', // destructive button on the confirm sheet
  copyMeal: 'Kopírovat jídlo', // overflow action opening the copy-destination picker (spec #599)
  copyHere: 'Kopírovat sem', // every meal-type target in the destination picker (spec #599)
  confirmDelete: 'Potvrdit smazání', // future-proof; not currently rendered (deleteMeal is itself the confirm verb)

  /** Skin observation delete (issue #394, ADR-0021 amendment) */
  deleteObservation: 'Smazat pozorování', // destructive button on the /skin confirm sheet
} as const;
