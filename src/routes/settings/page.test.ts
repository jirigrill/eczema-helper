import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import type { ScheduleContext } from '$lib/stores/schedule-context';

const mockReset = vi.fn();
const mockGoto = vi.fn();

// Mimics the real store's behaviour right after reset() resolves: it still
// reports the stale 'ready' value until `emit` is called with 'empty' —
// exercising the wait-for-non-ready guard in resetPrototype (issue #353).
let emit: (ctx: ScheduleContext) => void = () => {};
const mockSubscribe = vi.fn((cb: (ctx: ScheduleContext) => void) => {
  emit = cb;
  cb({ status: 'ready' } as ScheduleContext);
  return () => {};
});

vi.mock('$lib/stores/protocol-session', () => ({
  protocolSession: {
    subscribe: mockSubscribe,
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

  it('calls reset and navigates to / on button click, once the context leaves ready', async () => {
    mockReset.mockResolvedValue(undefined);
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    await fireEvent.click(getByText('Restartovat dotazník'));
    expect(mockReset).toHaveBeenCalledOnce();
    expect(mockGoto).not.toHaveBeenCalled();

    emit({ status: 'empty' });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockGoto).toHaveBeenCalledWith('/');
  });
});
