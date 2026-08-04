import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedingStage } from '$lib/domain/models';
import type { SeededStatus } from '$lib/stores/settings.svelte';

const mockReset = vi.fn();
const mockSetFeedingStage = vi.fn();
const mockGoto = vi.fn();

// Mimics the settings liveQuery right after reset() clears the row: it still
// reports the stale 'seeded' value until `emit` is called with 'unset' —
// exercising the wait-for-unset guard in resetPrototype (issue #353, re-opened
// against the feeding-stage seeded signal per PRD #623 §3d).
let emit: (status: SeededStatus) => void = () => {};
const mockSeededSubscribe = vi.fn((cb: (status: SeededStatus) => void) => {
  emit = cb;
  cb('seeded');
  return () => {};
});

let currentFeedingStage: FeedingStage | null = 'breastfed';

vi.mock('$lib/stores/settings.svelte', () => ({
  settingsStore: {
    get feedingStage() {
      return currentFeedingStage;
    },
    setFeedingStage: mockSetFeedingStage,
    reset: mockReset,
  },
  seededStatus: { subscribe: mockSeededSubscribe },
}));
vi.mock('$app/navigation', () => ({ goto: mockGoto }));

beforeEach(() => {
  mockReset.mockReset();
  mockGoto.mockReset();
  mockSetFeedingStage.mockReset();
  currentFeedingStage = 'breastfed';
});

describe('settings/+page.svelte', () => {
  it('shows reset warning text', async () => {
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    expect(getByText(/Restartování vymaže/)).toBeInTheDocument();
  });

  it('calls reset and navigates to / only once the feeding stage flips to unset (§3d)', async () => {
    mockReset.mockResolvedValue(undefined);
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);
    await fireEvent.click(getByText('Restartovat'));
    expect(mockReset).toHaveBeenCalledOnce();
    // The seeded signal is still reporting the stale 'seeded' value — the guard
    // must not navigate yet, or the layout would bounce straight back.
    expect(mockGoto).not.toHaveBeenCalled();

    emit('unset');
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
