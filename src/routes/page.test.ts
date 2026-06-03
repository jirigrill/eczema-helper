import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: mockGoto }));

const mockStartProtocol = vi.fn().mockResolvedValue({ ok: true, data: undefined });
vi.mock('$lib/stores/protocol-session', () => ({
  protocolSession: {
    subscribe: vi.fn(),
    startProtocol: (...args: unknown[]) => mockStartProtocol(...args),
  },
}));

vi.mock('$lib/db/atopic-db', () => ({ db: {} }));

const today = new Date().toISOString().split('T')[0];

beforeEach(() => {
  mockGoto.mockReset();
  mockStartProtocol.mockResolvedValue({ ok: true, data: undefined });
});

describe('+page.svelte — onboarding redirect', () => {
  it('after completing onboarding, goto navigates to /day/<today>', async () => {
    const { default: OnboardingPage } = await import('./+page.svelte');
    const { getByRole, getByLabelText } = render(OnboardingPage);
    await tick();

    // Step 1 → 2
    await fireEvent.click(getByRole('button', { name: /Začít/ }));
    await tick();

    // Step 2: fill required birthdate, then advance
    const birthdateInput = getByLabelText(/datum narození/i);
    await fireEvent.input(birthdateInput, { target: { value: '2025-01-01' } });
    await tick();
    await fireEvent.click(getByRole('button', { name: /Pokračovat/ }));
    await tick();

    // Steps 3, 4, 5 — no required fields, just advance
    for (let i = 0; i < 3; i++) {
      await fireEvent.click(getByRole('button', { name: /Pokračovat/ }));
      await tick();
    }

    // Step 6: confirm
    await fireEvent.click(getByRole('button', { name: /Potvrdit a spustit program/ }));
    await tick();

    expect(mockGoto).toHaveBeenCalledWith(`/day/${today}`);
  });
});
