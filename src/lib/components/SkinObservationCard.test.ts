import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { SkinObservation } from '$lib/domain/models';
import SkinObservationCard from './SkinObservationCard.svelte';

function makeObservation(overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: 'obs-1',
    date: '2026-05-31',
    createdAt: '2026-05-31T08:00:00.000Z',
    regions: [{ id: 'face', level: 1 }],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────

describe('SkinObservationCard', () => {
  it('shows empty-state text when no observations are passed', async () => {
    const { getByText } = render(SkinObservationCard, { props: { observations: [] } });
    await tick();
    expect(getByText('Zatím není záznam pro dnešek.')).toBeInTheDocument();
  });

  it('renders the derived day-overall severity label', async () => {
    const { getByText } = render(SkinObservationCard, {
      props: { observations: [makeObservation({ regions: [{ id: 'face', level: 2 }] })] },
    });
    await tick();
    expect(getByText('střední')).toBeInTheDocument();
  });

  it('day-overall severity is max across regions and observations', async () => {
    const obs1 = makeObservation({
      id: 'obs-1',
      regions: [
        { id: 'face', level: 1 },
        { id: 'arms', level: 2 },
      ],
    });
    const obs2 = makeObservation({
      id: 'obs-2',
      regions: [
        { id: 'belly', level: 3 },
        { id: 'legs', level: 1 },
      ],
    });
    const { getByText } = render(SkinObservationCard, {
      props: { observations: [obs1, obs2] },
    });
    await tick();
    expect(getByText('silné')).toBeInTheDocument();
  });

  it('renders observation notes when present', async () => {
    const { getByText } = render(SkinObservationCard, {
      props: { observations: [makeObservation({ notes: 'rash on left arm' })] },
    });
    await tick();
    expect(getByText('rash on left arm')).toBeInTheDocument();
  });

  it('shows the section label "Stav ekzému"', async () => {
    const { getByText } = render(SkinObservationCard, { props: { observations: [] } });
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
  });

  // Issue #379 AC: distinguish "no observation today" from "observation: all klidné".
  // Empty → text-only empty-state copy. All-klidné observation → severity dot +
  // "klidné" label + record count. The empty-state copy must NOT appear in
  // the latter case.
  it('renders the severity dot + "klidné" label for an all-klidné observation (not the empty state)', async () => {
    const allKlidne = makeObservation({
      regions: [
        { id: 'face', level: 0 },
        { id: 'scalp', level: 0 },
        { id: 'neck', level: 0 },
        { id: 'belly', level: 0 },
        { id: 'back', level: 0 },
        { id: 'arms', level: 0 },
        { id: 'elbow-folds', level: 0 },
        { id: 'knee-folds', level: 0 },
        { id: 'legs', level: 0 },
      ],
    });
    const { getByText, queryByText, getByTestId } = render(SkinObservationCard, {
      props: { observations: [allKlidne] },
    });
    await tick();

    // Empty-state copy must NOT render when an observation exists, even if
    // every region is klidné. The presence of the observation IS the signal
    // that the mother checked.
    expect(queryByText('Zatím není záznam pro dnešek.')).toBeNull();

    // The summary block renders with the klidné severity label + record count.
    expect(getByTestId('skin-observation-summary')).toBeInTheDocument();
    expect(getByText('klidné')).toBeInTheDocument();
    expect(getByTestId('day-card-right').textContent).toContain('1 záznam');
  });

  // Guards against the frozen-snippet bug class: the `right` count must track
  // the observations prop reactively, not freeze at its first-render value.
  it('record count in the header updates when the observations prop changes', async () => {
    const { getByTestId, rerender } = render(SkinObservationCard, {
      props: { observations: [makeObservation({ id: 'obs-1' })] },
    });
    await tick();
    expect(getByTestId('day-card-right').textContent).toContain('1 záznam');

    await rerender({
      observations: [
        makeObservation({ id: 'obs-1' }),
        makeObservation({ id: 'obs-2' }),
        makeObservation({ id: 'obs-3' }),
      ],
    });
    await tick();
    expect(getByTestId('day-card-right').textContent).toContain('3 záznamy');
  });
});
