import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import PhaseBadge from './PhaseBadge.svelte';
import type { SchedulePhaseType } from '$lib/domain/models';

describe('PhaseBadge', () => {
  const phases: SchedulePhaseType[] = ['reset', 'elimination', 'reintroduction', 'rest', 'tolerance-building'];

  it.each(phases)('renders without throwing for type "%s"', (type) => {
    expect(() => render(PhaseBadge, { props: { type } })).not.toThrow();
  });

  it('sets data-state to the phase type', () => {
    const { container } = render(PhaseBadge, { props: { type: 'elimination' } });
    expect(container.querySelector('[data-state="elimination"]')).not.toBeNull();
  });

  const czechLabels: [SchedulePhaseType, string][] = [
    ['reset',          'Reset'],
    ['elimination',    'Eliminace'],
    ['reintroduction', 'Reintrodukce'],
    ['rest',           'Odpočinek'],
    ['tolerance-building', 'Budování tolerance'],
  ];

  it.each(czechLabels)('renders Czech label for type "%s"', (type, label) => {
    const { getByText } = render(PhaseBadge, { props: { type } });
    expect(getByText(label)).toBeInTheDocument();
  });
});
