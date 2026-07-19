// Manual mode drives the ladder engine by hand, producing the *same* shared
// event-stream `JourneyRun` scenario replay produces (#533, PRD #527) — so the
// journey and cascade render identically regardless of which mode built the run.
// It mirrors the scenario shape exactly: a run setup fixed at session start, and
// the same three per-day event kinds applied to "today", plus advance-day. It is
// NOT a free-form live editor and carries none of `simulate.ts`'s mid-run
// stage/phase/permanent switches. NO decision logic lives here — like the
// scenario loader, it only *constructs* the domain records the engine reads.
import type { AllergenOutcome, PortionKind, RegionLevel } from '$lib/domain/models';

import type { JourneyRun } from './journey';
import { buildRun, nextISO, type RunEvent, type RunSetup } from './run-events';

/**
 * An in-progress manual session. `setup` is captured once at start and never
 * re-exposed for mutation, so allergen/phase/stage/permanent cannot change
 * mid-run. `days` grows one consecutive date per advance; `actions` records what
 * was logged on which day, exactly like a scenario's `days: [{date, events}]`.
 */
export type ManualSession = {
  readonly setup: RunSetup;
  readonly days: readonly string[];
  readonly actions: readonly RunEvent[];
};

/** Begin a manual run at `startDate` (defaults to today), with no actions logged. */
export function startManualRun(
  setup: RunSetup,
  startDate = new Date().toISOString().slice(0, 10),
): ManualSession {
  return { setup, days: [startDate], actions: [] };
}

/** The day actions currently apply to — the latest day advanced to. */
function today(session: ManualSession): string {
  // `days` is always non-empty: startManualRun seeds it, and advanceDay appends.
  return session.days[session.days.length - 1]!;
}

function withAction(session: ManualSession, action: RunEvent): ManualSession {
  return { ...session, actions: [...session.actions, action] };
}

export function logMeal(session: ManualSession, meal: PortionKind | 'none'): ManualSession {
  return withAction(session, { date: today(session), meal });
}

export function logSkin(session: ManualSession, skin: RegionLevel): ManualSession {
  return withAction(session, { date: today(session), skin });
}

export function logEval(session: ManualSession, outcome: AllergenOutcome): ManualSession {
  return withAction(session, { date: today(session), eval: outcome });
}

/** Advance to the next consecutive calendar day — the new "today". */
export function advanceDay(session: ManualSession): ManualSession {
  return { ...session, days: [...session.days, nextISO(today(session))] };
}

/** Project the session onto the shared `JourneyRun` both modes render. */
export function toRun(session: ManualSession): JourneyRun {
  return buildRun(session.setup, session.days, session.actions);
}
