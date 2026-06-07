import { todayIso } from '$lib/utils/date';

export function parseDayQuery(url: URL): { date: string; returnTo: string } {
  const date = url.searchParams.get('date') ?? todayIso();
  const returnTo = url.searchParams.get('returnTo') ?? `/day/${date}`;
  return { date, returnTo };
}
