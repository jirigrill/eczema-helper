import type { ReintroductionEvaluation } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type ReintroductionEvaluationRepository = {
  save(evaluation: ReintroductionEvaluation): Promise<Result<void, string>>;
  loadByPhase(phaseId: string): Promise<Result<ReintroductionEvaluation | null, string>>;
  listAll(): Promise<Result<ReintroductionEvaluation[], string>>;
};
