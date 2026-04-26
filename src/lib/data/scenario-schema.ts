import type { EczemaSeverity, AmountSize, DailyAssessment } from '$lib/domain/models';

export type ScenarioSetup = {
  babyBirthDate: string;
  eczemaSeverity: EczemaSeverity;
  motherAllergies: string[];
  babyConfirmedAllergies: string[];
  programStartDate: string;
  testedAllergens?: string[]; // allergen slugs in reintroduction order; defaults to [soy, wheat, eggs, dairy]
};

export type ScenarioMealItem = {
  name: string;
  category: string | null;
  amount: AmountSize;
};

export type ScenarioMeal = {
  type: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  items: ScenarioMealItem[];
  savedAt?: string;
};

export type ScenarioDayEvaluation = {
  type: 'allergen-test' | 'skin-status';
  allergen?: string;
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
