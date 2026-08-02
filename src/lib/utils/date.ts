export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return localIsoDate(new Date());
}

export function addDays(iso: string, n: number): string {
  // `iso` is an internal YYYY-MM-DD string, so the split yields exactly three parts.
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localIsoDate(d);
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function formatDateCs(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  // The space after the day number is a non-breaking space (U+00A0) — the
  // required Czech date style, intentional rather than stray whitespace.
  // eslint-disable-next-line no-irregular-whitespace
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function formatWeekdayShortCs(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('cs-CZ', { weekday: 'short' });
}

export function formatWeekdayLongCs(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('cs-CZ', { weekday: 'long' });
}

export function formatDateLongCs(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });
}

/** "9:12" — local hour (no leading zero), minute padded. */
export function formatObservationTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
