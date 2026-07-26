import { type Actor, isActor } from '$lib/domain/models';
import { todayIso } from '$lib/utils/date';

export function parseDayQuery(url: URL): { date: string; returnTo: string; actor?: Actor } {
  const date = url.searchParams.get('date') ?? todayIso();
  const returnTo = url.searchParams.get('returnTo') ?? `/day/${date}`;
  // `?actor=` (issue #584) carries the day-view row's actor into the editor.
  // Undefined when absent or not a known Actor — the route falls back to its
  // implicit-actor default in that case.
  const rawActor = url.searchParams.get('actor');
  const actor = isActor(rawActor) ? rawActor : undefined;
  return { date, returnTo, actor };
}
