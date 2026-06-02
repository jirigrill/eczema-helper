export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDays(iso: string, n: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function formatDateCs(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function formatDateLongCs(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type RouteDateResult =
  | { type: 'date'; date: string }
  | { type: 'redirect'; to: string };

export function resolveRouteDate(
  param: string,
  protocolStart: string,
  today: string,
): RouteDateResult {
  if (!ISO_DATE_RE.test(param)) return { type: 'redirect', to: today };
  if (param > today) return { type: 'redirect', to: today };
  if (param < protocolStart) return { type: 'redirect', to: today };
  return { type: 'date', date: param };
}
