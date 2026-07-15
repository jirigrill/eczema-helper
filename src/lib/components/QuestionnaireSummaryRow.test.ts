import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import QuestionnaireSummaryRow from './QuestionnaireSummaryRow.svelte';

describe('QuestionnaireSummaryRow', () => {
  it('renders the label and value', () => {
    const { getByText } = render(QuestionnaireSummaryRow, {
      props: { label: 'Narození', value: '12. 9. 2025' },
    });
    expect(getByText('Narození')).toBeInTheDocument();
    expect(getByText('12. 9. 2025')).toBeInTheDocument();
  });

  it('renders as button when onEdit is provided', () => {
    const { container } = render(QuestionnaireSummaryRow, {
      props: { label: 'Závažnost', value: 'Střední', onEdit: vi.fn() },
    });
    expect(container.querySelector('button')).not.toBeNull();
    expect(container.querySelector('div[class*="rounded-xl"]')).toBeNull();
  });

  it('renders as div when onEdit is absent', () => {
    const { container } = render(QuestionnaireSummaryRow, {
      props: { label: 'Závažnost', value: 'Střední' },
    });
    expect(container.querySelector('button')).toBeNull();
  });

  it('shows "Upravit ›" when onEdit is provided', () => {
    const { getByText } = render(QuestionnaireSummaryRow, {
      props: { label: 'Moje alergie', value: 'žádné', onEdit: vi.fn() },
    });
    expect(getByText('Upravit ›')).toBeInTheDocument();
  });

  it('does not show "Upravit ›" when onEdit is absent', () => {
    const { queryByText } = render(QuestionnaireSummaryRow, {
      props: { label: 'Moje alergie', value: 'žádné' },
    });
    expect(queryByText('Upravit ›')).toBeNull();
  });

  it('calls onEdit when the row is clicked', async () => {
    const onEdit = vi.fn();
    const { container } = render(QuestionnaireSummaryRow, {
      props: { label: 'Začátek', value: '1. 3. 2026', onEdit },
    });
    await fireEvent.click(container.querySelector('button')!);
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
