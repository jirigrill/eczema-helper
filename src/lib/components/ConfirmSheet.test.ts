import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ConfirmSheet from './ConfirmSheet.svelte';

const baseProps = {
  open: false,
  heading: 'Smazat jídlo?',
  body: 'Toto jídlo bude odstraněno.',
  confirmLabel: 'Smazat jídlo',
  cancelLabel: 'Zrušit',
  onConfirm: () => {},
  onCancel: () => {},
};

describe('ConfirmSheet', () => {
  it('renders nothing when closed', () => {
    const { queryByRole } = render(ConfirmSheet, { props: baseProps });
    expect(queryByRole('dialog')).not.toBeInTheDocument();
    expect(queryByRole('button', { name: 'Smazat jídlo' })).not.toBeInTheDocument();
  });

  it('renders heading, body, and both labels when open', () => {
    const { getByRole, getByText } = render(ConfirmSheet, {
      props: { ...baseProps, open: true },
    });
    expect(getByRole('dialog', { name: 'Smazat jídlo?' })).toBeInTheDocument();
    expect(getByText('Smazat jídlo?')).toBeInTheDocument();
    expect(getByText('Toto jídlo bude odstraněno.')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Smazat jídlo' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Zrušit' })).toBeInTheDocument();
  });

  it('confirm button tap fires onConfirm', async () => {
    const onConfirm = vi.fn();
    const { getByRole } = render(ConfirmSheet, {
      props: { ...baseProps, open: true, onConfirm },
    });
    await fireEvent.click(getByRole('button', { name: 'Smazat jídlo' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancel button tap fires onCancel', async () => {
    const onCancel = vi.fn();
    const { getByRole } = render(ConfirmSheet, {
      props: { ...baseProps, open: true, onCancel },
    });
    await fireEvent.click(getByRole('button', { name: 'Zrušit' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('backdrop tap fires onCancel', async () => {
    const onCancel = vi.fn();
    const { getByTestId } = render(ConfirmSheet, {
      props: { ...baseProps, open: true, onCancel },
    });
    await fireEvent.click(getByTestId('confirm-sheet-backdrop'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('primary variant applies primary styling to the confirm button', () => {
    const { getByRole } = render(ConfirmSheet, {
      props: { ...baseProps, open: true, confirmVariant: 'primary' },
    });
    expect(getByRole('button', { name: 'Smazat jídlo' })).toHaveAttribute(
      'data-variant',
      'primary',
    );
  });

  it('danger variant applies danger styling to the confirm button', () => {
    const { getByRole } = render(ConfirmSheet, {
      props: { ...baseProps, open: true, confirmVariant: 'danger' },
    });
    expect(getByRole('button', { name: 'Smazat jídlo' })).toHaveAttribute('data-variant', 'danger');
  });

  it('defaults confirmVariant to primary when omitted', () => {
    const { getByRole } = render(ConfirmSheet, {
      props: { ...baseProps, open: true },
    });
    expect(getByRole('button', { name: 'Smazat jídlo' })).toHaveAttribute(
      'data-variant',
      'primary',
    );
  });
});
