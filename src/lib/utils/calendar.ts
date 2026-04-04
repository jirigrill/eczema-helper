export type DayInfo = {
  date: string; // ISO date: "2026-03-15"
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

/**
 * Get all days to display in a month grid.
 * Returns 6 weeks (42 days) to ensure consistent grid height.
 * Includes padding days from adjacent months.
 */
export function getMonthDays(year: number, month: number): DayInfo[] {
  const today = getTodayIso();
  const days: DayInfo[] = [];

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Convert to Monday-first: Mon=0, Tue=1, ..., Sun=6
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Add padding days from previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const date = formatDateIso(prevYear, prevMonth, dayNum);
    days.push({
      date,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: date === today,
    });
  }

  // Add days of current month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const date = formatDateIso(year, month, dayNum);
    days.push({
      date,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: date === today,
    });
  }

  // Add padding days from next month to fill 6 weeks (42 days)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const remaining = 42 - days.length;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const date = formatDateIso(nextYear, nextMonth, dayNum);
    days.push({
      date,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: date === today,
    });
  }

  return days;
}

/**
 * Format month and year for display in Czech locale.
 * Returns e.g., "březen 2026"
 */
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
}

/**
 * Format a date in Czech short format: "15. 3."
 */
export function formatDateShort(isoDate: string): string {
  const [, monthStr, dayStr] = isoDate.split('-');
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  return `${day}. ${month}.`;
}

/**
 * Format a date in Czech long format: "15. března 2026"
 */
export function formatDateLong(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Get today's date as ISO string.
 */
export function getTodayIso(): string {
  const now = new Date();
  return formatDateIso(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Check if a date string is today.
 */
export function isToday(isoDate: string): boolean {
  return isoDate === getTodayIso();
}

/**
 * Check if a date belongs to a specific month.
 */
export function isSameMonth(isoDate: string, year: number, month: number): boolean {
  const [dateYear, dateMonth] = isoDate.split('-').map(Number);
  return dateYear === year && dateMonth - 1 === month; // month is 0-indexed in JS
}

/**
 * Format year, month (0-indexed), day as ISO date string.
 */
function formatDateIso(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Parse ISO date string to year, month (0-indexed), day.
 */
export function parseDateIso(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month: month - 1, day };
}

/**
 * Get the weekday names in Czech (Monday-first).
 */
export function getWeekdayNames(): string[] {
  return ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
}

/**
 * Navigate to a different month.
 * Returns new year and month values after applying the delta.
 */
export function navigateMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  let newMonth = month + delta;
  let newYear = year;

  while (newMonth > 11) {
    newMonth -= 12;
    newYear++;
  }
  while (newMonth < 0) {
    newMonth += 12;
    newYear--;
  }

  return { year: newYear, month: newMonth };
}
