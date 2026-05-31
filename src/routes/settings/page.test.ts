import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

const mockReset = vi.fn();
const mockGoto = vi.fn();

vi.mock('$lib/stores/protocol-session', () => ({
  protocolSession: {
    subscribe: vi.fn(() => () => {}),
    reset: mockReset,
  },
}));
vi.mock('$app/navigation', () => ({ goto: mockGoto }));

describe('settings/+page.svelte', () => {
  it('shows reset warning text', async () => {
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    expect(getByText(/Restartování vymaže/)).toBeInTheDocument();
  });

  it('calls reset and navigates to / on button click', async () => {
    mockReset.mockResolvedValue(undefined);
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    await fireEvent.click(getByText('Restartovat dotazník'));
    expect(mockReset).toHaveBeenCalledOnce();
  });
});
