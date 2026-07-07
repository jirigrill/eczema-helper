// Domain model for the eczema-tracking app.

// ── Allergen identifiers ──────────────────────────────────────
// Derived from the data-first catalog (ADR-0017) and re-exported here so
// existing `$lib/domain/models` import sites are unchanged. The catalog is the
// single source of truth — these are no longer hand-written unions.
import type {
  AllergenId,
  CatalogAllergenId,
  ProtocolAllergenId,
  CustomAllergenId,
} from '$lib/data/allergen-catalog';
import type { ProtocolDay, AllergenProtocol, Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import type { FamilyId, FoodId, CatalogFoodId } from '$lib/data/allergen-catalog/allergen-catalog';

export type {
  AllergenId,
  CatalogAllergenId,
  ProtocolAllergenId,
  CustomAllergenId,
  FamilyId,
  FoodId,
  CatalogFoodId,
  ProtocolDay,
  AllergenProtocol,
  Ladder,
  LadderStep,
};

// ── Allergen status ───────────────────────────────────────────

export type AllergenStatusValue =
  | 'permanent-mother'     // Mother's own allergy. Lifelong. Never reintroduced.
  | 'permanent-baby'       // Baby's confirmed allergy. Eliminated; eligible for end-of-program retest.
  | 'not-yet-tested'       // Protocol allergen whose reintroduction phase hasn't started yet.
  | 'eliminated'           // Protocol allergen inside the active elimination (or reset) phase.
  | 'testing'              // Inside a reintroduction phase right now.
  | 'passed'               // Latest reintroduction completed cleanly (no rest follow-up).
  | 'reacted'              // Latest reintroduction was followed by a rest phase.
  | 'tolerance-building';  // Open-ended phase delivering small doses.

export type AllergenStatus = {
  allergenId: AllergenId;
  status: AllergenStatusValue;
};

export type EczemaSeverity = 'mild' | 'moderate' | 'severe';

export type QuestionnaireAnswers = {
  babyBirthDate: string; // ISO date YYYY-MM-DD
  eczemaSeverity: EczemaSeverity;
  motherAllergies: AllergenId[]; // permanent, never reintroduced — may include custom
  babyConfirmedAllergies: AllergenId[]; // permanent, never reintroduced — may include custom
  programStartDate: string; // ISO date — when the program begins
  completedAt: string; // ISO datetime
  testedAllergens: ProtocolAllergenId[]; // protocol-only — custom slugs can't be reintroduced
};

export type PhaseType = 'reset' | 'elimination' | 'reintroduction' | 'rest' | 'tolerance-building';

export type SchedulePhase = {
  id: string;
  type: PhaseType;
  startDate: string; // ISO date
  endDate: string; // ISO date
  allergenIds: ProtocolAllergenId[]; // protocol allergens relevant to this phase
};

export type GeneratedSchedule = {
  phases: SchedulePhase[];
  permanentMother: AllergenId[]; // mother's confirmed allergies — never reintroduced
  permanentBaby: AllergenId[]; // baby's confirmed allergies — never reintroduced
  startDate: string;
  estimatedEndDate: string;
};

/**
 * Returns all permanently eliminated allergens (union of mother's and baby's).
 * Use this instead of accessing both fields directly.
 */
export function getPermanentEliminations(schedule: GeneratedSchedule): AllergenId[] {
  return [...new Set([...schedule.permanentMother, ...schedule.permanentBaby])];
}

export type PortionKind = 'pinch' | 'teaspoon' | 'spoon' | 'portion' | 'package';

/**
 * Single source of truth for preparation methods, in chip-display order.
 * The type derives from this array — add or remove a method here only, and
 * `preparationStrings` (labels) and `formPreparations` (form→subset) fail
 * `tsc` via their `satisfies` clauses until they match.
 */
export const PREPARATION_METHODS = ['raw', 'boiled', 'baked', 'fried'] as const;
export type PreparationMethod = (typeof PREPARATION_METHODS)[number];

export type MealItem = {
  id: string;
  name: string; // Czech display name
  foodId: FoodId; // identifies the specific food; custom foods use `other:${string}`
  amount: PortionKind;
  preparationMethod?: PreparationMethod;
};

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

/** Composite key enforcing the one-meal-per-slot invariant: `"${date}:${mealType}"` */
export type MealId = `${string}:${MealType}`;

export function mealId(date: string, mealType: MealType): MealId {
  return `${date}:${mealType}`;
}

export function parseMealId(id: MealId): { date: string; mealType: MealType } {
  const [date, mealType] = id.split(':') as [string, MealType];
  return { date, mealType };
}

export type Meal = {
  id: MealId; // deterministic composite key — e.g. "2026-05-27:lunch"
  date: string; // ISO date
  mealType: MealType;
  actor: 'mother' | 'baby'; // v1 hardcodes 'mother'; 'baby' reserved for v2
  items: MealItem[];
  notes?: string; // optional free-text observation (renamed from label)
  createdAt: string; // ISO datetime; render as Czech HH:MM at display sites (ADR-0014)
  /**
   * ISO datetime, set on edit-update only (issue #277, ADR-0018). Absent on a
   * compose-new write — `undefined` means "never edited since creation". Edits
   * preserve `createdAt` and stamp this field; only a fresh compose-new mints
   * a new `createdAt`.
   */
  updatedAt?: string;
};

/**
 * Body region the mother taps on the /skin grid. Canonical kebab-case slugs;
 * Czech labels live in `$lib/strings/skin-regions` keyed by `RegionId`.
 */
export type RegionId =
  | 'face'
  | 'scalp'
  | 'neck'
  | 'belly'
  | 'back'
  | 'arms'
  | 'elbow-folds'
  | 'knee-folds'
  | 'legs';

export const REGION_IDS: readonly RegionId[] = [
  'face',
  'scalp',
  'neck',
  'belly',
  'back',
  'arms',
  'elbow-folds',
  'knee-folds',
  'legs',
] as const;

/** Per-region severity. 0 = klidné (explicit default), 1 = mírné, 2 = střední, 3 = silné. */
export type RegionLevel = 0 | 1 | 2 | 3;

export type SkinRegionRecord = { id: RegionId; level: RegionLevel };

export type SkinObservation = {
  id: string;
  date: string; // ISO date
  createdAt: string; // ISO datetime
  /** Per-region severities. A region absent from the array is treated as klidné (0). */
  regions: SkinRegionRecord[];
  notes?: string;
};

/**
 * Day-overall severity = max(level over the observation's regions). Never
 * persisted — derive at every read site. Returns 0 when no region is logged.
 */
export function overallSeverity(observation: SkinObservation): RegionLevel {
  let max: RegionLevel = 0;
  for (const r of observation.regions) {
    if (r.level > max) max = r.level;
  }
  return max;
}

export type SkinPhoto = {
  id: string;
  observationId: string;
  region: RegionId;
  capturedAt: string; // ISO datetime
  blob: Blob;
};

/** Unsaved photo shape — callers never mint id/observationId/capturedAt. */
export type SkinPhotoInput = {
  region: RegionId;
  blob: Blob;
};

export type ReintroductionDayInfo = {
  dayInPhase: number;
  totalDays: number;
  allergenId: ProtocolAllergenId;
  isEvaluationDay: boolean;
};

// Allergen tolerance — used for reintroduction phases
export type AllergenOutcome = 'tolerated' | 'mild-reaction' | 'clear-reaction' | 'severe-reaction';

// Skin status change — used for reset and elimination phases
export type SkinEvaluationOutcome = 'improved' | 'unchanged' | 'worsened' | 'new-lesions';

export type ReintroductionEvaluation = {
  phaseId: string; // links to SchedulePhase.id
  phaseType: 'allergen-test' | 'skin-status'; // determines which outcome vocabulary applies
  outcome: AllergenOutcome | SkinEvaluationOutcome;
  allergenId?: ProtocolAllergenId; // only set for allergen-test evaluations
  notes?: string;
  date: string; // ISO date when evaluation was made
};

export type AppState = {
  answers: QuestionnaireAnswers | null;
  schedule: GeneratedSchedule | null;
  meals: Meal[];
  skinObservations: SkinObservation[];
  evaluations: ReintroductionEvaluation[];
};

export type ToleranceBuildingReminder = {
  allergenId: ProtocolAllergenId;
  daysSinceLastDose: number;
  // No display label — resolve via categoryConfig[allergenId] at render sites (ADR-0014).
};
