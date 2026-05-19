import type { QuestionnaireAnswers } from '$lib/domain/models';
import type { QuestionnaireRepository } from '$lib/domain/ports/questionnaire-repository';
import type { Result } from '$lib/types/result';

export class InMemoryQuestionnaireRepository implements QuestionnaireRepository {
  private _data: QuestionnaireAnswers | null = null;

  async save(answers: QuestionnaireAnswers): Promise<Result<void, string>> {
    this._data = answers;
    return { ok: true, data: undefined };
  }

  async load(): Promise<Result<QuestionnaireAnswers | null, string>> {
    return { ok: true, data: this._data };
  }
}
