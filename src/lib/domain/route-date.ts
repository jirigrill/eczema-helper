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
