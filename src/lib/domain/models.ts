// Domain model for the eczema-tracking app.

// ── Allergen identifiers ──────────────────────────────────────
// Two-tier shape — see ADR-0014 "Domain-key shapes".

export type ProtocolAllergenId =
  | 'dairy'
  | 'eggs'
  | 'wheat'
  | 'soy'
  | 'nuts'
  | 'fish'
  | 'shellfish'
  | 'citrus'
  | 'chocolate'
  | 'tomatoes'
  | 'strawberries'
  | 'corn'
  | 'sesame';

export type CustomAllergenId = `other:${string}`;

export type AllergenId = ProtocolAllergenId | CustomAllergenId;

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

export type MealItem = {
  id: string;
  name: string; // Czech display name
  allergenId: AllergenId | null;
  subitemId?: string | null; // e.g. 'dairy:yogurt' — optional, narrows allergenId to a specific sub-item
  amount: PortionKind;
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
  assessments: DailyAssessment[];
  evaluations: ReintroductionEvaluation[];
};

export type ToleranceBuildingReminder = {
  allergenId: ProtocolAllergenId;
  daysSinceLastDose: number;
  label: string;
};

export type Category = {
  allergenId: ProtocolAllergenId;
  subItems: SubItem[];
};

export type SubItem = {
  subitemId: SubitemId;
  allergenId: ProtocolAllergenId;
};

// Subitem identifiers — format: 'allergenId:uniquePart', e.g. 'dairy:milk'.
// Two-tier shape mirrors ProtocolAllergenId — see ADR-0014 "Domain-key shapes".
export type SubitemId =
  | 'dairy:milk' | 'dairy:butter' | 'dairy:cheese' | 'dairy:yogurt' | 'dairy:cream' | 'dairy:cottage'
  | 'eggs:egg-white' | 'eggs:egg-yolk'
  | 'wheat:bread' | 'wheat:pasta' | 'wheat:flour' | 'wheat:gluten'
  | 'soy:soy-milk' | 'soy:tofu' | 'soy:soy-sauce' | 'soy:soy-lecithin'
  | 'nuts:peanuts' | 'nuts:walnuts' | 'nuts:hazelnuts' | 'nuts:almonds' | 'nuts:cashews'
  | 'fish:freshwater-fish' | 'fish:saltwater-fish' | 'fish:fish-oil'
  | 'shellfish:shrimp' | 'shellfish:crab' | 'shellfish:mussels'
  | 'citrus:oranges' | 'citrus:lemons' | 'citrus:grapefruit' | 'citrus:mandarins'
  | 'chocolate:dark-choc' | 'chocolate:milk-choc' | 'chocolate:cocoa'
  | 'tomatoes:fresh-tomatoes' | 'tomatoes:tomato-sauce' | 'tomatoes:ketchup'
  | 'strawberries:fresh-strawberries' | 'strawberries:strawberry-jam'
  | 'corn:corn-flour' | 'corn:sweet-corn'
  | 'sesame:sesame-seeds' | 'sesame:tahini';
