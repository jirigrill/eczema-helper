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
