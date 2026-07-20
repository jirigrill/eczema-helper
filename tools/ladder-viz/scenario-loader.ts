// Loads a `*.yaml` scenario into the shared event-stream type the journey and
// cascade render (#532, PRD #527). The YAML is Zod-validated on load — a typo,
// a bad enum, an unknown allergen, or a non-strict date sequence is a loud load
// error, never a silently-reconstructed run. NO decision logic lives here: the
// loader only validates + shapes external input, then hands it to the shared
// `buildRun` (`run-events.ts`) that manual mode also uses, so the two modes are
// genuinely one event stream and cannot drift.
import { load as parseYaml } from 'js-yaml';
import { z } from 'zod';

import type { LadderAllergenId } from '$lib/domain/models';

import type { JourneyRun } from './journey';
import {
  buildRun,
  LADDERS,
  nextISO,
  OUTCOMES,
  PHASES,
  PORTION_KINDS,
  STAGES,
  type RunEvent,
} from './run-events';

/**
 * A real ISO calendar date (`YYYY-MM-DD`): right shape *and* a date that exists.
 * The round-trip through the UTC anchor rejects impossible days (`2026-13-40`)
 * that a bare regex would wave through, so a bad date is a clear load error at
 * the boundary rather than an `Invalid Date` that only misfires later in
 * `nextISO`/`assertStrictDates`.
 */
function isRealISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const isoDate = z
  .string()
  .refine(isRealISODate, { message: 'date must be a real ISO calendar date (YYYY-MM-DD)' });

const mealEvent = z.object({
  meal: z.union([z.enum([...PORTION_KINDS]), z.literal('none')]),
});
const skinEvent = z.object({
  skin: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});
const evalEvent = z.object({ eval: z.enum([...OUTCOMES]) });
const dayEvent = z.union([mealEvent, skinEvent, evalEvent]);

// `allergen` is external input, so it is validated at this boundary against the
// catalog rather than trusted: an id with no ladder is a loud load error, and
// the refinement narrows the parsed value to `LadderAllergenId` (no cast).
const allergenId = z
  .string()
  .refine((id): id is LadderAllergenId => LADDERS.has(id as LadderAllergenId), {
    message: 'unknown allergen (no ladder in the catalog)',
  });

const scenarioSchema = z.object({
  allergen: allergenId,
  phase: z.enum([...PHASES]),
  stage: z.enum([...STAGES]),
  permanent: z.boolean().default(false),
  days: z.array(
    z.object({
      date: isoDate,
      events: z.array(dayEvent).default([]),
    }),
  ),
});

type ScenarioDoc = z.infer<typeof scenarioSchema>;

/**
 * Enforce strict, consecutive, ascending dates (#523): the author lists every
 * calendar day explicitly and the tool does no gap-filling or reordering, so a
 * duplicate, out-of-order, or skipped date is a loud load error rather than a
 * gap the tool silently reconstructs.
 */
function assertStrictDates(dates: readonly string[]): void {
  for (let i = 1; i < dates.length; i++) {
    // `i` runs 1..length-1, so both indices are in bounds (safe `!`).
    const prev = dates[i - 1]!;
    const curr = dates[i]!;
    const expected = nextISO(prev);
    if (curr !== expected) {
      throw new Error(
        `scenario: dates must be strict, consecutive, ascending — expected ${expected} after ${prev}, got ${curr}`,
      );
    }
  }
}

/** Flatten a scenario's `days: [{date, events}]` into the shared dated events. */
function flattenEvents(doc: ScenarioDoc): RunEvent[] {
  return doc.days.flatMap((day) => day.events.map((event) => ({ ...event, date: day.date })));
}

/** Parse + Zod-validate one scenario's YAML into the shared `JourneyRun`. */
export function parseScenario(yamlText: string): JourneyRun {
  const doc: ScenarioDoc = scenarioSchema.parse(parseYaml(yamlText));
  const dates = doc.days.map((d) => d.date);
  assertStrictDates(dates);

  return buildRun(
    { allergen: doc.allergen, phase: doc.phase, stage: doc.stage, permanent: doc.permanent },
    dates,
    flattenEvents(doc),
  );
}
