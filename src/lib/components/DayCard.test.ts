import { createRawSnippet } from 'svelte';

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import DayCard from './DayCard.svelte';

describe('DayCard', () => {
  it('renders the label', () => {
    const { getByText } = render(DayCard, { props: { label: 'Stav ekzému' } });
    expect(getByText('Stav ekzému')).toBeInTheDocument();
  });

  it('renders children snippet content', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Tělo karty</p>' }));
    const { getByText } = render(DayCard, { props: { label: 'Test', children } });
    expect(getByText('Tělo karty')).toBeInTheDocument();
  });

  it('renders right snippet when provided', () => {
    const right = createRawSnippet(() => ({ render: () => '<span>3 záznamy</span>' }));
    const { getByText } = render(DayCard, { props: { label: 'Test', right } });
    expect(getByText('3 záznamy')).toBeInTheDocument();
  });

  it('renders no right-slot content when right prop is absent', () => {
    const { queryByTestId } = render(DayCard, { props: { label: 'Test' } });
    expect(queryByTestId('day-card-right')).toBeNull();
  });
});
