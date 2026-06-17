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
import type { ProtocolDay, AllergenProtocol } from '$lib/domain/canonical-allergen';
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

export type PreparationMethod = 'raw' | 'boiled' | 'steamed' | 'baked' | 'fried';

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

export type SkinObservation = {
  id: string;
  date: string; // ISO date
  createdAt: string; // ISO datetime
  status: 'improved' | 'unchanged' | 'worsened' | 'new-lesions';
  notes?: string;
};

export type SkinPhoto = {
  id: string;
  date: string; // ISO date
  capturedAt: string; // ISO datetime
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
export type SkinStatusOutcome = 'improved' | 'unchanged' | 'worsened' | 'new-lesions';

export type ReintroductionEvaluation = {
  phaseId: string; // links to SchedulePhase.id
  phaseType: 'allergen-test' | 'skin-status'; // determines which outcome vocabulary applies
  outcome: AllergenOutcome | SkinStatusOutcome;
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
