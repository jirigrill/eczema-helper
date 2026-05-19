import type { QuestionnaireAnswers } from '$lib/domain/models';
import type { QuestionnaireRepository } from '$lib/domain/ports/questionnaire-repository';
import type { Result } from '$lib/types/result';
import { type AtopicDb, SINGLETON_ID } from '$lib/db/atopic-db';

export class DexieQuestionnaireRepository implements QuestionnaireRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(answers: QuestionnaireAnswers): Promise<Result<void, string>> {
    try {
      await this.db.answers.put({ id: SINGLETON_ID, ...answers });
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async load(): Promise<Result<QuestionnaireAnswers | null, string>> {
    try {
      const row = await this.db.answers.get(SINGLETON_ID);
      if (!row) return { ok: true, data: null };
      const { id: _id, ...answers } = row;
      return { ok: true, data: answers };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
