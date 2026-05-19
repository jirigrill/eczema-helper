import type { QuestionnaireAnswers } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type QuestionnaireRepository = {
  save(answers: QuestionnaireAnswers): Promise<Result<void, string>>;
  load(): Promise<Result<QuestionnaireAnswers | null, string>>;
};
