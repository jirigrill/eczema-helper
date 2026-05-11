import type { QuestionnaireAnswers } from '$lib/domain/models';
import type { QuestionnaireRepository } from '$lib/domain/ports/questionnaire-repository';
import { type AtopicDb, SINGLETON_ID } from '$lib/db/atopic-db';

export class DexieQuestionnaireRepository implements QuestionnaireRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(answers: QuestionnaireAnswers): Promise<void> {
    await this.db.answers.put({ id: SINGLETON_ID, ...answers });
  }

  async load(): Promise<QuestionnaireAnswers | null> {
    const row = await this.db.answers.get(SINGLETON_ID);
    if (!row) return null;
    const { id: _id, ...answers } = row;
    return answers;
  }
}
