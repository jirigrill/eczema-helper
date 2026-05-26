// Domain model for the eczema-tracking app.

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
  id: string;
  status: AllergenStatusValue;
};

export type EczemaSeverity = 'mild' | 'moderate' | 'severe';

export type QuestionnaireAnswers = {
  babyBirthDate: string; // ISO date YYYY-MM-DD
  eczemaSeverity: EczemaSeverity;
  motherAllergies: string[]; // category IDs — permanent, never reintroduced
  babyConfirmedAllergies: string[]; // category IDs — permanent, never reintroduced
  programStartDate: string; // ISO date — when the program begins
  completedAt: string; // ISO datetime
  testedAllergens: string[]; // category IDs to eliminate and reintroduce, in reintroduction order
};

export type PhaseType = 'reset' | 'elimination' | 'reintroduction' | 'rest' | 'tolerance-building';

export type SchedulePhase = {
  id: string;
  type: PhaseType;
  startDate: string; // ISO date
  endDate: string; // ISO date
  categoryIds: string[]; // allergens relevant to this phase
};

export type GeneratedSchedule = {
  phases: SchedulePhase[];
  permanentMother: string[]; // category IDs from mother's confirmed allergies — never reintroduced
  permanentBaby: string[]; // category IDs from baby's confirmed allergies — never reintroduced
  startDate: string;
  estimatedEndDate: string;
};

/**
 * Returns all permanently eliminated allergens (union of mother's and baby's).
 * Use this instead of accessing both fields directly.
 */
export function getPermanentEliminations(schedule: GeneratedSchedule): string[] {
  return [...new Set([...schedule.permanentMother, ...schedule.permanentBaby])];
}

/** @deprecated Use PortionKind. Kept as alias during migration. */
export type AmountSize = PortionKind;

export type PortionKind = 'pinch' | 'teaspoon' | 'spoon' | 'portion' | 'package';

export type MealItem = {
  id: string;
  name: string; // Czech display name
  categoryId: string | null;
  subitemId?: string | null; // e.g. 'dairy:yogurt' — optional, narrows categoryId to a specific sub-item
  amount: AmountSize;
};

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type Meal = {
  id: string;
  date: string; // ISO date
  mealType: MealType;
  items: MealItem[];
  label?: string;
  savedAt: string; // HH:MM
};

export type DailyAssessment = {
  date: string; // ISO date
  status: 'improved' | 'unchanged' | 'worsened' | 'new-lesions';
  notes?: string;
  photoTaken: boolean;
};

export type ProtocolDay = {
  day: number;
  instructionCs: string;
  isEvaluationDay: boolean;
};

export type AllergenProtocol = {
  days: ProtocolDay[];
};

export type ReintroductionDayInfo = {
  dayInPhase: number;
  totalDays: number;
  allergenId: string;
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
  allergenId?: string; // only set for allergen-test evaluations
  notes?: string;
  date: string; // ISO date when evaluation was made
};

export type AppState = {
  answers: QuestionnaireAnswers | null;
  schedule: GeneratedSchedule | null;
  meals: Meal[];
  assessments: DailyAssessment[];
  evaluations: ReintroductionEvaluation[];
};

export type ToleranceBuildingReminder = {
  allergenId: string;
  daysSinceLastDose: number;
  label: string;
};

export type Category = {
  categoryId: string;
  nameCs: string;
  icon: string;
  subItems: SubItem[];
};

export type SubItem = {
  subitemId: string; // format: 'categoryId:uniquePart', e.g. 'dairy:milk'
  categoryId: string;
  nameCs: string;
};
