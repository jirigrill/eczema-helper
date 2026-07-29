import { createRawSnippet } from 'svelte';

import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BottomSheet from './BottomSheet.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>Obsah sheetu</p>' }));

const baseProps = {
  open: false,
  ariaLabel: 'Testovací sheet',
  onDismiss: () => {},
  children,
};

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    const { queryByRole, queryByText } = render(BottomSheet, { props: baseProps });
    expect(queryByRole('dialog')).not.toBeInTheDocument();
    expect(queryByText('Obsah sheetu')).not.toBeInTheDocument();
  });

  it('renders the panel with aria-label and children when open', () => {
    const { getByRole, getByText } = render(BottomSheet, {
      props: { ...baseProps, open: true },
    });
    expect(getByRole('dialog', { name: 'Testovací sheet' })).toBeInTheDocument();
    expect(getByText('Obsah sheetu')).toBeInTheDocument();
  });

  it('backdrop tap fires onDismiss', async () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(BottomSheet, {
      props: { ...baseProps, open: true, onDismiss, backdropTestid: 'my-backdrop' },
    });
    await fireEvent.click(getByTestId('my-backdrop'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('backdrop carries the supplied testid', () => {
    const { getByTestId } = render(BottomSheet, {
      props: { ...baseProps, open: true, backdropTestid: 'copy-picker-backdrop' },
    });
    expect(getByTestId('copy-picker-backdrop')).toBeInTheDocument();
  });

  it('panel sits on the modal-content layer above the FAB (z-[70])', () => {
    const { getByRole } = render(BottomSheet, {
      props: { ...baseProps, open: true },
    });
    expect(getByRole('dialog').className).toContain('z-[70]');
  });

  it('backdrop sits on the modal-scrim layer (z-[60])', () => {
    const { getByTestId } = render(BottomSheet, {
      props: { ...baseProps, open: true, backdropTestid: 'scrim' },
    });
    expect(getByTestId('scrim').className).toContain('z-[60]');
  });
});
