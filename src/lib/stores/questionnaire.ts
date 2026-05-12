import { readable } from "svelte/store";
import { liveQuery } from "dexie";

import { db, SINGLETON_ID } from "$lib/db/atopic-db";
import type { QuestionnaireAnswers } from "$lib/domain/models";
import type { Readable } from "svelte/store";

export const questionnaireStore: Readable<QuestionnaireAnswers | null | undefined> = readable(
  undefined,
  (set) => {
    const subscription = liveQuery(async () => {
      const row = await db.answers.get(SINGLETON_ID);
      if (!row) return null;
      const { id: _id, ...answers } = row;
      return answers as QuestionnaireAnswers;
    }).subscribe({
      next: (value) => set(value ?? null),
      error: () => set(null),
    });
    return () => subscription.unsubscribe();
  },
);
