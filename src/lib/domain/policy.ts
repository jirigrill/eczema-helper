/**
 * Protocol policy constants — tunable domain numbers for the elimination diet program.
 *
 * All numeric knobs that govern phase durations, evaluation windows, and thresholds
 * live here. Tuning the protocol requires touching only this file.
 */

import type { LadderAllergenId } from "$lib/data/allergen-catalog";
import type { PhaseType } from "$lib/domain/models";
import { addDays, isDateInRange } from "$lib/utils/date";

// ── Number of days before/after program ─────────────────────────────────

/** Number of days before and after program for which user can log meals and skin observations */

export const BUFFER_BEFORE_START_DAYS = 7;
export const BUFFER_AFTER_END_DAYS = 100;

/**
 * True when `date` falls inside the loggable window — the program's
 * [startDate, estimatedEndDate] span, padded by the buffer constants above.
 * The single hard limit enforced by every meal/skin-observation save path.
 */
export function isWithinLoggableWindow(
  date: string,
  scheduleStart: string,
  scheduleEnd: string,
): boolean {
  return isDateInRange(
    date,
    addDays(scheduleStart, -BUFFER_BEFORE_START_DAYS),
    addDays(scheduleEnd, BUFFER_AFTER_END_DAYS),
  );
}

// ── Default tested allergens ─────────────────────────────────

/**
 * Default order in which allergens are eliminated and reintroduced: least → most
 * common trigger. A protocol policy choice, not catalog reference data — which
 * allergens *exist* is the catalog's job; which we *test by default* is this file's.
 */
export const DEFAULT_TESTED_ALLERGENS: LadderAllergenId[] = [
  "soy",
  "wheat",
  "eggs",
  "dairy",
];

// ── Phase durations (in days) ────────────────────────────────

/** Duration of the initial reset phase, during which the mother eats normally to establish a baseline. */
export const RESET_PHASE_DAYS = 5;

/** Duration of the full-elimination phase for non-severe eczema. */
export const ELIMINATION_PHASE_DAYS_DEFAULT = 14;

/** Duration of the full-elimination phase for severe eczema (longer window for clearer signal). */
export const ELIMINATION_PHASE_DAYS_SEVERE = 21;

/** Duration of each sequential reintroduction phase (3 escalating eating days + 1 evaluation day). */
export const REINTRODUCTION_PHASE_DAYS = 4;

// ── Training / tolerance-building thresholds ─────────────────

/**
 * Minimum number of days since the last training dose before a reminder fires.
 * Mirrors the protocol guideline: training doses should appear at most every N days
 * to avoid desensitisation.
 */
export const TRAINING_REMINDER_THRESHOLD_DAYS = 3;

/**
 * Sentinel value used when no training dose has ever been logged.
 * Large enough to guarantee the reminder always fires on the first day of training.
 */
export const NEVER_DOSED_SENTINEL_DAYS = 999;

// ── Recovery rest after a reaction ───────────────────────────

/**
 * Length of the rest phase inserted after a `mild-reaction` verdict (ADR-0016).
 * Severity scales rest length, not permanence — protocol allergens are never
 * permanently eliminated by a reaction, only rested before the protocol continues.
 */
export const REST_PHASE_DAYS_MILD = 3;

/** Length of the rest phase inserted after a `clear-reaction` verdict. */
export const REST_PHASE_DAYS_CLEAR = 7;

/** Length of the rest phase inserted after a `severe-reaction` verdict. */
export const REST_PHASE_DAYS_SEVERE = 14;

// ── Dose-escalation ladder cadence + reaction cap ────────────

/**
 * Minimum days between escalation steps while growing the dose of an
 * already-accepted allergen (feature direction F3, phase `tolerance-building`;
 * ADR-0023). Gentle by design — an allergen the baby already tolerates is grown
 * no faster than its maintenance re-dose rhythm (`TRAINING_REMINDER_THRESHOLD_DAYS`).
 * Injected into the ladder decision engine as `cadenceDays` via `cadenceForPhase`.
 */
export const ACCEPTED_ALLERGEN_CADENCE_DAYS = 3;

/**
 * Minimum days between escalation steps during an active reintroduction
 * (feature direction F4, phase `reintroduction`; ADR-0023). One rung per eating
 * day, matching the three escalating eating days of the reintroduction phase
 * (`REINTRODUCTION_PHASE_DAYS` — three eating days plus one evaluation day); the
 * evaluation checkpoint and reaction → rest machinery, not a long spacing, carry
 * the safety here. Injected into the ladder decision engine as `cadenceDays` via
 * `cadenceForPhase`.
 */
export const REINTRODUCTION_CADENCE_DAYS = 1;

/**
 * How many times one ladder rung may react before the decision engine treats it
 * as a confirmed ceiling and stops re-attempting it (ADR-0023). A single
 * reaction is a temporary setback — rest, step back, re-test; reacting this many
 * times converts the rung into a terminal `ceiling-reached` and defers to human
 * care (ADR-0024 medical-scope boundary). Never converts an allergen to a
 * `permanent-*` status itself (ADR-0012).
 */
export const MAX_RUNG_REACTIONS = 2;

/**
 * Look-back window for the skin-stability gate (ADR-0023 §decision-engine).
 * Held to `max(cadenceDays, 3)` by `stabilityWindowFor`; three days is the
 * shortest span in which "skin got worse" reads as a genuine trend rather
 * than day-to-day noise, and reintroduction's 1-day cadence must not shrink
 * the safety window below that floor.
 */
export const SKIN_STABILITY_WINDOW_DAYS = 3;

/** The look-back window `decideLadderMove` should compare skin against. */
export function stabilityWindowFor(phase: LadderPhase): number {
  return Math.max(cadenceForPhase(phase), SKIN_STABILITY_WINDOW_DAYS);
}

/** The two protocol phases that walk the dose ladder (ADR-0023 F3 ≡ F4). */
export type LadderPhase = Extract<PhaseType, "tolerance-building" | "reintroduction">;

/**
 * The single definition of "which cadence for which phase". The ladder decision
 * engine takes `cadenceDays` as an explicit injected value and never derives
 * F3-vs-F4 itself; callers source that value here so the mapping lives in exactly
 * one place, beside the constants it returns (ADR-0023 phase → cadence seam).
 */
export function cadenceForPhase(phase: LadderPhase): number {
  switch (phase) {
    case "reintroduction":
      return REINTRODUCTION_CADENCE_DAYS;
    case "tolerance-building":
      return ACCEPTED_ALLERGEN_CADENCE_DAYS;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}
