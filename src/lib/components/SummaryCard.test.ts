import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import SummaryCard from './SummaryCard.svelte';

describe('SummaryCard', () => {
  it('renders the label', () => {
    const { getByText } = render(SummaryCard, { props: { label: 'Miminko' } });
    expect(getByText('Miminko')).toBeInTheDocument();
  });

  it('shows Upravit button when onEdit is provided', () => {
    const onEdit = vi.fn();
    const { getByText } = render(SummaryCard, { props: { label: 'Test', onEdit } });
    expect(getByText('Upravit')).toBeInTheDocument();
  });

  it('hides Upravit button when onEdit is not provided', () => {
    const { queryByText } = render(SummaryCard, { props: { label: 'Test' } });
    expect(queryByText('Upravit')).toBeNull();
  });

  it('calls onEdit when Upravit is clicked', async () => {
    const onEdit = vi.fn();
    const { getByText } = render(SummaryCard, { props: { label: 'Test', onEdit } });
    await fireEvent.click(getByText('Upravit'));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('renders slot content', () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Obsah karty</p>' }));
    const { getByText } = render(SummaryCard, { props: { label: 'Test', children } });
    expect(getByText('Obsah karty')).toBeInTheDocument();
  });
});
