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
    status: 'unchanged',
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

  it('renders a saved observation status label', async () => {
    const { getByText } = render(SkinObservationCard, {
      props: { observations: [makeObservation({ status: 'improved' })] },
    });
    await tick();
    expect(getByText('Zlepšení')).toBeInTheDocument();
  });

  it('renders observation notes when present', async () => {
    const { getByText } = render(SkinObservationCard, {
      props: { observations: [makeObservation({ notes: 'rash on left arm' })] },
    });
    await tick();
    expect(getByText('rash on left arm')).toBeInTheDocument();
  });

  it('renders multiple observations', async () => {
    const { getByText } = render(SkinObservationCard, {
      props: {
        observations: [
          makeObservation({ id: 'obs-1', status: 'improved' }),
          makeObservation({ id: 'obs-2', status: 'worsened' }),
        ],
      },
    });
    await tick();
    expect(getByText('Zlepšení')).toBeInTheDocument();
    expect(getByText('Zhoršení')).toBeInTheDocument();
  });

  it('shows the section label "Stav ekzému"', async () => {
    const { getByText } = render(SkinObservationCard, { props: { observations: [] } });
    await tick();
    expect(getByText('Stav ekzému')).toBeInTheDocument();
  });
});
