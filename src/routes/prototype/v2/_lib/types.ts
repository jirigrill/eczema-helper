// ═══════════════════════════════════════════════════════════
// V2 Prototype Types — fully self-contained, no domain imports
// ═══════════════════════════════════════════════════════════

export type EczemaSeverity = 'mild' | 'moderate' | 'severe';

export type QuestionnaireAnswers = {
  babyBirthDate: string; // ISO date YYYY-MM-DD
  eczemaSeverity: EczemaSeverity;
  motherAllergies: string[]; // category slugs — permanent, never reintroduced
  babyConfirmedAllergies: string[]; // category slugs — permanent, never reintroduced
  programStartDate: string; // ISO date — when the program begins
  completedAt: string; // ISO datetime
};

export type SchedulePhaseType = 'reset' | 'elimination' | 'reintroduction' | 'rest' | 'training';

export type SchedulePhase = {
  id: string;
  type: SchedulePhaseType;
  label: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  categorySlugs: string[]; // allergens relevant to this phase
  description: string;
};

export type GeneratedSchedule = {
  phases: SchedulePhase[];
  permanentEliminations: string[]; // slugs never reintroduced
  startDate: string;
  estimatedEndDate: string;
};

export type AmountSize = 'pinch' | 'teaspoon' | 'spoon' | 'portion' | 'package';

export type PrototypeMealItem = {
  id: string;
  name: string; // Czech display name
  categorySlug: string | null;
  amount: AmountSize;
};

export type PrototypeMeal = {
  id: string;
  date: string; // ISO date
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  items: PrototypeMealItem[];
  label?: string;
  savedAt: string; // HH:MM
};

export type DailyAssessment = {
  date: string; // ISO date
  status: 'improved' | 'unchanged' | 'worsened' | 'new-lesions';
  notes?: string;
  photoTaken: boolean;
};

export type ReintroductionDayInfo = {
  dayInPhase: number;
  totalDays: number;
  allergenSlug: string;
  label: string;
  guidance: string;
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
  allergenSlug?: string; // only set for allergen-test evaluations
  notes?: string;
  date: string; // ISO date when evaluation was made
};

export type PrototypeState = {
  answers: QuestionnaireAnswers | null;
  schedule: GeneratedSchedule | null;
  meals: PrototypeMeal[];
  assessments: DailyAssessment[];
  evaluations: ReintroductionEvaluation[];
  dateOffset?: number; // days relative to today; 0 = today, positive = future
};

export type TrainingReminder = {
  allergenSlug: string;
  daysSinceLastDose: number;
  label: string;
};

export type ProtoCategory = {
  slug: string;
  nameCs: string;
  icon: string;
  subItems: ProtoSubItem[];
};

export type ProtoSubItem = {
  id: string;
  categorySlug: string;
  nameCs: string;
};
