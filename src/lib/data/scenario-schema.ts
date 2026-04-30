import type { EczemaSeverity, AmountSize, DailyAssessment } from '$lib/domain/models';

export type ScenarioSetup = {
  babyBirthDate: string;
  eczemaSeverity: EczemaSeverity;
  motherAllergies: string[];
  babyConfirmedAllergies: string[];
  programStartDate: string;
  testedAllergens?: string[]; // allergen category IDs in reintroduction order; defaults to [soy, wheat, eggs, dairy]
};

export type ScenarioMealItem = {
  name?: string; // optional when subitemId is provided — derived from sub-item nameCs
  categoryId?: string | null; // optional when subitemId is provided — derived from subitemId prefix
  subitemId?: string | null; // e.g. 'dairy:yogurt' — resolves name and categoryId automatically
  amount: AmountSize;
};

export type ScenarioMeal = {
  type: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  items: ScenarioMealItem[];
  savedAt?: string;
};

export type ScenarioDayEvaluation = {
  type: 'allergen-test' | 'skin-status';
  allergenId?: string;
  outcome: string;
  notes?: string;
};

export type ScenarioDayEntry = {
  assessment?: DailyAssessment['status'];
  assessmentNotes?: string;
  assessmentPhotoTaken?: boolean;
  meals?: ScenarioMeal[];
  evaluation?: ScenarioDayEvaluation;
};

export type Scenario = {
  name: string;
  description?: string;
  setup: ScenarioSetup;
  days?: Record<string, ScenarioDayEntry>;
};
