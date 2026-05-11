import type { QuestionnaireAnswers } from '$lib/domain/models';
import type { QuestionnaireRepository } from '$lib/domain/ports/questionnaire-repository';

export class InMemoryQuestionnaireRepository implements QuestionnaireRepository {
  private _data: QuestionnaireAnswers | null = null;

  async save(answers: QuestionnaireAnswers): Promise<void> {
    this._data = answers;
  }

  async load(): Promise<QuestionnaireAnswers | null> {
    return this._data;
  }
}
