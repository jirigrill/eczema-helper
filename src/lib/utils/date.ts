/**
 * Date formatting utilities.
 *
 * Shared utilities for consistent date handling across the codebase.
 */

/**
 * Format a date value to ISO date string (YYYY-MM-DD).
 *
 * Handles:
 * - Date objects (from JavaScript)
 * - ISO strings with time component (from PostgreSQL timestamp)
 * - Plain date strings (already formatted)
 *
 * @param value - Date, string, or unknown value to format
 * @returns ISO date string in YYYY-MM-DD format
 *
 * @example
 * formatDateToIso(new Date('2024-03-15')) // '2024-03-15'
 * formatDateToIso('2024-03-15T10:30:00Z') // '2024-03-15'
 * formatDateToIso('2024-03-15') // '2024-03-15'
 */
export function formatDateToIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  // If already a string, extract date portion if it contains 'T'
  const str = String(value);
  return str.includes('T') ? str.split('T')[0] : str;
}

/**
 * Format a date for Czech display (e.g., "15.3." or "15.3.2024").
 *
 * @param date - ISO date string (YYYY-MM-DD)
 * @param includeYear - Whether to include the year
 * @returns Czech formatted date string
 *
 * @example
 * formatDateCzech('2024-03-15') // '15.3.'
 * formatDateCzech('2024-03-15', true) // '15.3.2024'
 */
export function formatDateCzech(date: string, includeYear = false): string {
  const [year, month, day] = date.split('-');
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);

  if (includeYear) {
    return `${dayNum}.${monthNum}.${year}`;
  }
  return `${dayNum}.${monthNum}.`;
}

/**
 * Get today's date as an ISO string (YYYY-MM-DD).
 *
 * @returns Today's date in ISO format
 */
export function getTodayIso(): string {
  return formatDateToIso(new Date());
}

/**
 * Calculate age in months from a birth date.
 *
 * @param birthDate - Birth date as ISO string
 * @param asOf - Date to calculate age as of (defaults to today)
 * @returns Age in months
 */
export function calculateAgeInMonths(birthDate: string, asOf?: string): number {
  const birth = new Date(birthDate);
  const now = asOf ? new Date(asOf) : new Date();

  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());

  // Adjust if day hasn't passed yet this month
  if (now.getDate() < birth.getDate()) {
    return months - 1;
  }
  return months;
}
