import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import type { FeedingStage } from '$lib/domain/models';
import type { ScheduleContext } from '$lib/stores/schedule-context';

const mockReset = vi.fn();
const mockSetFeedingStage = vi.fn();
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

let currentFeedingStage: FeedingStage | null = 'breastfed';

vi.mock('$lib/stores/protocol-session', () => ({
  protocolSession: {
    subscribe: mockSubscribe,
    reset: mockReset,
  },
}));
vi.mock('$lib/stores/settings.svelte', () => ({
  settingsStore: {
    get feedingStage() {
      return currentFeedingStage;
    },
    setFeedingStage: mockSetFeedingStage,
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

  it('renders a pill for each feeding stage with the current one active', async () => {
    currentFeedingStage = 'breastfed';
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    const active = getByText('Plně kojené');
    expect(active.closest('button')).toHaveAttribute('data-active', 'true');
    expect(getByText('Kojené + příkrmy').closest('button')).toHaveAttribute('data-active', 'false');
  });

  it('persists the picked feeding stage via settingsStore.setFeedingStage', async () => {
    currentFeedingStage = 'breastfed';
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    await fireEvent.click(getByText('Plně na příkrmech'));
    expect(mockSetFeedingStage).toHaveBeenCalledWith('solids');
  });
});
