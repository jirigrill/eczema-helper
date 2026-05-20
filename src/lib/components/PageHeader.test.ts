import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PageHeader from './PageHeader.svelte';

describe('PageHeader', () => {
  it('renders the title', () => {
    const { getByText } = render(PageHeader, { props: { title: 'Nastavení' } });
    expect(getByText('Nastavení')).toBeInTheDocument();
  });

  it('renders back button when onBack is provided', () => {
    const onBack = vi.fn();
    const { getByText } = render(PageHeader, { props: { title: 'Test', onBack } });
    expect(getByText('‹')).toBeInTheDocument();
  });

  it('omits back button when onBack is not provided', () => {
    const { queryByText } = render(PageHeader, { props: { title: 'Test' } });
    expect(queryByText('‹')).toBeNull();
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    const { getByText } = render(PageHeader, { props: { title: 'Test', onBack } });
    await fireEvent.click(getByText('‹'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
