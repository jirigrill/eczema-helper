/**
 * Protocol policy constants — tunable domain numbers for the elimination diet program.
 *
 * All numeric knobs that govern phase durations, evaluation windows, and thresholds
 * live here. Tuning the protocol requires touching only this file.
 */

import type { ProtocolAllergenId } from '$lib/data/allergen-catalog';

// ── Default tested allergens ─────────────────────────────────

/**
 * Default order in which allergens are eliminated and reintroduced: least → most
 * common trigger. A protocol policy choice, not catalog reference data — which
 * allergens *exist* is the catalog's job; which we *test by default* is this file's.
 */
export const DEFAULT_TESTED_ALLERGENS: ProtocolAllergenId[] = ['soy', 'wheat', 'eggs', 'dairy'];

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
