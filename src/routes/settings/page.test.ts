import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedingStage } from '$lib/domain/models';
import type { SettingsState } from '$lib/stores/settings-context';

const mockResetDatabase = vi.fn();
const mockSetFeedingStage = vi.fn();
const mockGoto = vi.fn();

// Mimics the settings liveQuery right after resetDatabase() clears the row: it
// still reports the stale 'seeded' value until `emit` is called with 'unset' —
// exercising the wait-for-unset guard in confirmReset (issue #353, re-opened
// against the feeding-stage seeded signal per PRD #623 §3d).
let emit: (state: SettingsState) => void = () => {};
const mockSettingsContextSubscribe = vi.fn((cb: (state: SettingsState) => void) => {
  emit = cb;
  cb({ status: 'seeded', settings: { feedingStage: 'breastfed' } });
  return () => {};
});

let currentFeedingStage: FeedingStage | null = 'breastfed';

vi.mock('$lib/stores/settings.svelte', () => ({
  settingsStore: {
    get feedingStage() {
      return currentFeedingStage;
    },
    setFeedingStage: mockSetFeedingStage,
  },
}));
vi.mock('$lib/stores/settings-context', () => ({
  settingsContext: { subscribe: mockSettingsContextSubscribe },
}));
vi.mock('$lib/db/reset-database', () => ({ resetDatabase: mockResetDatabase }));
vi.mock('$app/navigation', () => ({ goto: mockGoto }));

beforeEach(() => {
  mockResetDatabase.mockReset();
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

  // Reset wipes every table, photos included, and there is no backup mechanism
  // at all — so the destructive confirm is the last thing standing between one
  // tap and the mother's only copy of her records.
  it('does not wipe anything until the confirm sheet is accepted', async () => {
    mockResetDatabase.mockResolvedValue(undefined);
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText, queryByText } = render(SettingsPage);

    expect(queryByText('Opravdu restartovat?')).not.toBeInTheDocument();

    await fireEvent.click(getByText('Restartovat'));
    expect(getByText('Opravdu restartovat?')).toBeInTheDocument();
    expect(getByText(/Všechna jídla, pozorování i fotky/)).toBeInTheDocument();
    expect(mockResetDatabase).not.toHaveBeenCalled();
  });

  it('cancelling the confirm sheet wipes nothing and stays on the page', async () => {
    mockResetDatabase.mockResolvedValue(undefined);
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText } = render(SettingsPage);

    await fireEvent.click(getByText('Restartovat'));
    await fireEvent.click(getByText('Zrušit'));

    expect(mockResetDatabase).not.toHaveBeenCalled();
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('wipes and navigates to / only once the feeding stage flips to unset (§3d)', async () => {
    mockResetDatabase.mockResolvedValue(undefined);
    const { default: SettingsPage } = await import('./+page.svelte');
    const { getByText, getAllByText } = render(SettingsPage);
    await fireEvent.click(getByText('Restartovat'));
    // Both the page button and the sheet's confirm carry the same label; the
    // sheet's is the second one rendered.
    await fireEvent.click(getAllByText('Restartovat')[1]!);
    expect(mockResetDatabase).toHaveBeenCalledOnce();
    // The seeded signal is still reporting the stale 'seeded' value — the guard
    // must not navigate yet, or the layout would bounce straight back.
    expect(mockGoto).not.toHaveBeenCalled();

    emit({ status: 'unset' });
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
