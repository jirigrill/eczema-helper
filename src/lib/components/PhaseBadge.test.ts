import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import PhaseBadge from './PhaseBadge.svelte';
import type { SchedulePhaseType } from '$lib/domain/models';

describe('PhaseBadge', () => {
  const phases: SchedulePhaseType[] = ['reset', 'elimination', 'reintroduction', 'rest', 'training'];

  it.each(phases)('renders without throwing for type "%s"', (type) => {
    expect(() => render(PhaseBadge, { props: { type } })).not.toThrow();
  });

  it('sets data-variant to the phase type', () => {
    const { container } = render(PhaseBadge, { props: { type: 'elimination' } });
    expect(container.querySelector('[data-variant="elimination"]')).not.toBeNull();
  });

  it('renders Czech label for elimination', () => {
    const { getByText } = render(PhaseBadge, { props: { type: 'elimination' } });
    expect(getByText('Eliminace')).toBeInTheDocument();
  });

  it('renders Czech label for reintroduction', () => {
    const { getByText } = render(PhaseBadge, { props: { type: 'reintroduction' } });
    expect(getByText('Reintrodukce')).toBeInTheDocument();
  });
});
