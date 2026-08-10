/**
 * The earlier of the two repositories' earliest-logged dates, or null when both
 * are empty (§3a). Pure core of the earliest-logged store — the imperative
 * shell (`stores/earliest-logged.ts`) owns the `liveQuery` subscription and
 * calls this.
 */
export function earlierLoggedDate(mealDate: string | null, skinDate: string | null): string | null {
  if (mealDate === null) return skinDate;
  if (skinDate === null) return mealDate;
  return mealDate < skinDate ? mealDate : skinDate;
}
