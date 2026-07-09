import type { GeneratedSchedule } from '$lib/domain/models';

/**
 * Test fixture: build a minimal `GeneratedSchedule` with sensible defaults.
 *
 * Default span is `2026-05-01` → `2026-06-01` — arbitrary but stable, chosen
 * to sit well clear of the current date so buffer-boundary assertions
 * (`addDays(startDate, -BUFFER_BEFORE_START_DAYS)`, etc.) stay far from any
 * "today" edge cases in tests that later touch `todayIso()`.
 *
 * `phases` / `permanentMother` / `permanentBaby` default to empty because the
 * adapter tests that use this fixture don't consult phase content — they only
 * need the `startDate` / `estimatedEndDate` pair for the loggable-window
 * guard. Tests that need real phase content should pass an override.
 */
export function makeSchedule(overrides?: Partial<GeneratedSchedule>): GeneratedSchedule {
  return {
    phases: [],
    permanentMother: [],
    permanentBaby: [],
    startDate: '2026-05-01',
    estimatedEndDate: '2026-06-01',
    ...overrides,
  };
}
