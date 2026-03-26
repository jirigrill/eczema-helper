import type { AnalysisResult, FoodLog, Meal } from '$lib/domain/models';

export type AnalysisContext = {
  photoType: 'skin' | 'stool';
  childAge: string;
  bodyArea?: string;
  daysBetween: number;
  recentFoodChanges: FoodLog[];
  meals?: Meal[];
};

/**
 * Raw analysis output from the analyzer (before persistence).
 * Excludes `id` and `createdAt`/`updatedAt` which are assigned by the repository.
 */
export type AnalysisOutput = Omit<AnalysisResult, 'id' | 'createdAt' | 'updatedAt'>;

export interface EczemaAnalyzer {
  comparePhotos(
    photo1: Blob,
    photo2: Blob,
    context: AnalysisContext
  ): Promise<AnalysisOutput>;

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
