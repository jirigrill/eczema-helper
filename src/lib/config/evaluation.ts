import type {
  AllergenOutcome,
  PhaseType,
  SchedulePhase,
  SkinEvaluationOutcome,
} from '$lib/domain/models';
import { commonStrings } from '$lib/strings/common';

export type EvaluationKind = 'allergen-test' | 'skin-status';

export type EvaluationOutcomeOption = {
  value: AllergenOutcome | SkinEvaluationOutcome;
  label: string;
  subtitle: string;
};

export type EvaluationView = {
  kind: EvaluationKind;
  prompt: string;
  options: EvaluationOutcomeOption[];
};

const allergenOptions: EvaluationOutcomeOption[] = (
  ['tolerated', 'mild-reaction', 'clear-reaction', 'severe-reaction'] as const
).map((value) => ({
  value,
  label: commonStrings.program.reintroOutcomes[value] ?? value,
  subtitle: commonStrings.evaluation.outcomeSubtitles[value],
}));

const skinOptions: EvaluationOutcomeOption[] = (
  ['improved', 'unchanged', 'worsened', 'new-lesions'] as const
).map((value) => ({
  value,
  label: commonStrings.program.skinOutcomes[value] ?? value,
  subtitle: commonStrings.evaluation.skinOutcomeSubtitles[value],
}));

/**
 * Presentation view-model for the `/evaluation` screen, keyed by the phase
 * type being evaluated. Returns `null` for phases that are never evaluated
 * (rest, tolerance-building) — callers gate on `isPhaseEndForEvaluation`, so
 * a null here is a defensive guard.
 */
export function evaluationView(phaseType: PhaseType): EvaluationView | null {
  if (phaseType === 'reintroduction') {
    return {
      kind: 'allergen-test',
      prompt: commonStrings.evaluation.outcomePrompt,
      options: allergenOptions,
    };
  }
  if (phaseType === 'reset' || phaseType === 'elimination') {
    return {
      kind: 'skin-status',
      prompt: commonStrings.evaluation.skinOutcomePrompt,
      options: skinOptions,
    };
  }
  return null;
}

/**
 * The `/evaluation` link for a day's phase-hero, or `null` when the day should
 * fall back to `/program`. A phase is reachable when it is evaluable
 * (`evaluationView` non-null — reset / elimination / reintroduction) and either
 * a verdict already exists (revisit, read-only) or `selectedDate` is its last
 * day. Drives both the day phase-hero and mirrors the FAB gate.
 */
export function evaluationHrefForPhase(
  phase: SchedulePhase | null,
  selectedDate: string,
  hasEvaluation: boolean,
): string | null {
  if (!phase) return null;
  if (evaluationView(phase.type) === null) return null;
  const isEvalDay = phase.endDate ? selectedDate === phase.endDate : false;
  if (!hasEvaluation && !isEvalDay) return null;
  const returnTo = encodeURIComponent(`/day/${selectedDate}`);
  return `/evaluation?phase=${encodeURIComponent(phase.id)}&date=${selectedDate}&returnTo=${returnTo}`;
}
