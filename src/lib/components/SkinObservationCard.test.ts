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
