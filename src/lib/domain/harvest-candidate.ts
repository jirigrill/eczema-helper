import type { QuestionnaireAnswers } from '$lib/domain/models';

export type HarvestCandidateStatus = 'pending' | 'ingested';

export type HarvestCandidate = {
  normalizedKey: string;
  status: HarvestCandidateStatus;
  count: number;
  firstSeen: string; // ISO datetime
  lastSeen: string; // ISO datetime
  rawForms: string[];
};

/** Normalizes a raw food string to a stable lookup key. */
export { normalizeKey } from '$lib/domain/allergen-matcher';

/**
 * Extracts raw names from `other:${name}` slugs in questionnaire answers.
 * Called once at protocol-start time to seed harvest candidates from user-entered
 * allergen names that didn't match any canonical catalog entry.
 */
export function extractOtherSlugs(answers: QuestionnaireAnswers): string[] {
  const slugs = [...answers.motherAllergies, ...answers.babyConfirmedAllergies];
  return slugs
    .filter((s) => s.startsWith('other:'))
    .map((s) => s.slice(6))
    .filter((s) => s.length > 0);
}

/**
 * Pure upsert: returns a new candidate for the given observation.
 * If `existing` is null, creates a fresh record with count=1.
 * Otherwise bumps count, updates lastSeen, appends new deduped raw forms.
 * firstSeen is immutable after creation.
 */
export function mergeCandidate(
  existing: HarvestCandidate | null,
  raw: string,
  normalizedKey: string,
  timestamp: string,
): HarvestCandidate {
  const trimmed = raw.trim();

  if (existing === null) {
    return {
      normalizedKey,
      status: 'pending',
      count: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      rawForms: [trimmed],
    };
  }

  const newForms = existing.rawForms.includes(trimmed)
    ? existing.rawForms
    : [...existing.rawForms, trimmed];

  return {
    ...existing,
    count: existing.count + 1,
    lastSeen: timestamp,
    rawForms: newForms,
  };
}
