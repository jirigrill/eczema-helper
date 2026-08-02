import { tick } from 'svelte';

import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: mockGoto }));

const mockSetFeedingStage = vi.fn().mockResolvedValue({ ok: true, data: undefined });
vi.mock('$lib/stores/settings.svelte', () => ({
  settingsStore: {
    get feedingStage() {
      return null;
    },
    setFeedingStage: (...args: unknown[]) => mockSetFeedingStage(...args),
  },
}));

const today = new Date().toISOString().split('T')[0];

beforeEach(() => {
  mockGoto.mockReset();
  mockSetFeedingStage.mockReset();
  mockSetFeedingStage.mockResolvedValue({ ok: true, data: undefined });
});

describe('+page.svelte — first-run screen', () => {
  it('shows the welcome heading and the three feeding-stage options', async () => {
    const { default: FirstRun } = await import('./+page.svelte');
    const { getByText } = render(FirstRun);
    await tick();
    expect(getByText('Vítejte')).toBeInTheDocument();
    expect(getByText('Plně kojené')).toBeInTheDocument();
    expect(getByText('Kojené + příkrmy')).toBeInTheDocument();
    expect(getByText('Plně na příkrmech')).toBeInTheDocument();
  });

  it('writes the picked stage and lands on today when confirmed', async () => {
    const { default: FirstRun } = await import('./+page.svelte');
    const { getByText } = render(FirstRun);
    await tick();

    await fireEvent.click(getByText('Plně na příkrmech'));
    await tick();
    await fireEvent.click(getByText('Začít'));
    await tick();

    expect(mockSetFeedingStage).toHaveBeenCalledWith('solids');
    expect(mockGoto).toHaveBeenCalledWith(`/day/${today}`);
  });

  it('does not navigate when the stage write fails', async () => {
    mockSetFeedingStage.mockResolvedValue({ ok: false, error: 'db down' });
    const { default: FirstRun } = await import('./+page.svelte');
    const { getByText } = render(FirstRun);
    await tick();

    await fireEvent.click(getByText('Začít'));
    await tick();

    expect(mockSetFeedingStage).toHaveBeenCalled();
    expect(mockGoto).not.toHaveBeenCalled();
  });
});
