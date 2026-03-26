import type { AnalysisResult, FoodLog, Meal } from '$lib/domain/models';

export type AnalysisContext = {
  photoType: 'skin' | 'stool';
  childAge: string;
  bodyArea?: string;
  daysBetween: number;
  recentFoodChanges: FoodLog[];
  meals?: Meal[];
};

export interface EczemaAnalyzer {
  comparePhotos(
    photo1: Blob,
    photo2: Blob,
    context: AnalysisContext
  ): Promise<AnalysisResult>;

  assessSeverity(
    photo: Blob,
    context: { bodyArea: string }
  ): Promise<{
    severityScore: number;
    rednessScore: number;
    drynessScore: number;
    affectedAreaPct: number;
    description: string;
  }>;
}
