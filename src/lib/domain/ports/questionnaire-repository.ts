import type { QuestionnaireAnswers } from '$lib/domain/models';

export type QuestionnaireRepository = {
  save(answers: QuestionnaireAnswers): Promise<void>;
  load(): Promise<QuestionnaireAnswers | null>;
};
