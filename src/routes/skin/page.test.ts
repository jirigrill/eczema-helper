import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { SkinObservation } from '$lib/domain/models';

// ── Skin observation session mock ─────────────────────────────
const mockSave = vi.fn().mockResolvedValue({ ok: true, data: undefined });
vi.mock('$lib/stores/skin-observation-session', () => ({
  skinObservationSession: {
    subscribe: () => () => {},
    save: mockSave,
  },
  createSkinObservationSession: () => ({
    subscribe: () => () => {},
    save: mockSave,
  }),
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// ── Mutable page mock — lets tests control ?date= and ?returnTo= ──
const mockPage = { url: new URL('http://localhost/skin') };
vi.mock('$app/state', () => ({ page: mockPage }));

const today = new Date().toISOString().split('T')[0];

beforeEach(async () => {
  mockSave.mockClear();
  mockSave.mockResolvedValue({ ok: true, data: undefined });
  const { goto } = await import('$app/navigation');
  vi.mocked(goto).mockClear();
  mockPage.url = new URL('http://localhost/skin');
});

async function loadPage() {
  const { default: SkinPage } = await import('./+page.svelte');
  return SkinPage;
}

describe('skin/+page.svelte — region grid', () => {
  it('renders nine region tiles with their Czech labels', async () => {
    const SkinPage = await loadPage();
    const { getByText, container } = render(SkinPage);
    await tick();

    expect(container.querySelectorAll('[data-region]')).toHaveLength(9);

    for (const label of ['Tváře', 'Vlasová část', 'Krk', 'Břicho', 'Záda', 'Paže', 'Loketní jamky', 'Podkolení', 'Nohy']) {
      expect(getByText(label)).toBeInTheDocument();
    }
  });

  it('every region starts at klidné (level 0) by default', async () => {
    const SkinPage = await loadPage();
    const { container } = render(SkinPage);
    await tick();

    const tiles = container.querySelectorAll<HTMLElement>('[data-region]');
    for (const tile of tiles) {
      expect(tile.dataset.level).toBe('0');
    }
  });

  it('tapping an inactive region only activates it (level stays 0)', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    expect(face.dataset.active).toBe('false');
    expect(face.dataset.level).toBe('0');

    await fireEvent.click(face);
    await tick();

    expect(face.dataset.active).toBe('true');
    expect(face.dataset.level).toBe('0');
  });

  it('tapping the active region cycles 0→1→2→3→0', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face); // activate
    await tick();
    expect(face.dataset.level).toBe('0');

    await fireEvent.click(face); // 0 → 1
    await tick();
    expect(face.dataset.level).toBe('1');

    await fireEvent.click(face); // 1 → 2
    await tick();
    expect(face.dataset.level).toBe('2');

    await fireEvent.click(face); // 2 → 3
    await tick();
    expect(face.dataset.level).toBe('3');

    await fireEvent.click(face); // 3 → 0
    await tick();
    expect(face.dataset.level).toBe('0');
  });

  it('tapping a different region transfers activation, leaves the previous one logged', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    const arms = getByTestId('skin-region-arms');

    // Activate face and bring it to mírné (level 1).
    await fireEvent.click(face);
    await fireEvent.click(face);
    await tick();
    expect(face.dataset.level).toBe('1');
    expect(face.dataset.active).toBe('true');

    // Switching to arms keeps face's level recorded but transfers active marker.
    await fireEvent.click(arms);
    await tick();
    expect(arms.dataset.active).toBe('true');
    expect(face.dataset.active).toBe('false');
    expect(face.dataset.level).toBe('1');
  });

  it('Uložit is disabled when no region has level > 0', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('Uložit becomes enabled once any region is logged', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face); // activate
    await fireEvent.click(face); // 0→1
    await tick();

    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it('Uložit triggers save with regions array and an empty photos array', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face); // activate
    await fireEvent.click(face); // 0→1
    await tick();
    const save = getByTestId('skin-save');
    await fireEvent.click(save);
    await tick();

    expect(mockSave).toHaveBeenCalledOnce();
    const [observation, photos] = mockSave.mock.calls[0];
    expect(photos).toEqual([]);
    const obs = observation as SkinObservation;
    expect(obs.regions).toEqual([{ id: 'face', level: 1 }]);
    expect(obs.date).toBe(today);
  });

  it('persists multiple regions in the saved observation', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    // face = mírné (1), arms = silné (3)
    const face = getByTestId('skin-region-face');
    await fireEvent.click(face); // activate
    await fireEvent.click(face); // 1
    await tick();
    const arms = getByTestId('skin-region-arms');
    await fireEvent.click(arms); // activate (face level stays 1)
    await fireEvent.click(arms); // 1
    await fireEvent.click(arms); // 2
    await fireEvent.click(arms); // 3
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    const [obs] = mockSave.mock.calls[0];
    const o = obs as SkinObservation;
    expect(o.regions).toContainEqual({ id: 'face', level: 1 });
    expect(o.regions).toContainEqual({ id: 'arms', level: 3 });
  });

  it('persists the optional note', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face);
    await fireEvent.click(face);
    await tick();

    const note = getByTestId('skin-note') as HTMLTextAreaElement;
    await fireEvent.input(note, { target: { value: 'svědí' } });
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    const [obs] = mockSave.mock.calls[0];
    const o = obs as SkinObservation;
    expect(o.notes).toBe('svědí');
  });

  it('omits notes when textarea is blank', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face);
    await fireEvent.click(face);
    await tick();
    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    const [obs] = mockSave.mock.calls[0];
    expect((obs as SkinObservation).notes).toBeUndefined();
  });

  // ── Navigation: returnTo ──────────────────────────────────

  it('after save, goto is called with /day/<today> when no returnTo or date param', async () => {
    const SkinPage = await loadPage();
    const { goto } = await import('$app/navigation');
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face);
    await fireEvent.click(face);
    await tick();
    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    expect(goto).toHaveBeenCalledWith(`/day/${today}`);
  });

  it('returnTo defaults to /day/<date> when ?date= is set but ?returnTo= is absent', async () => {
    mockPage.url = new URL('http://localhost/skin?date=2025-01-10');
    const SkinPage = await loadPage();
    const { goto } = await import('$app/navigation');
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face);
    await fireEvent.click(face);
    await tick();
    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    expect(goto).toHaveBeenCalledWith('/day/2025-01-10');
  });

  it('after save, goto is called with custom returnTo when param is present', async () => {
    mockPage.url = new URL('http://localhost/skin?returnTo=/program');
    const SkinPage = await loadPage();
    const { goto } = await import('$app/navigation');
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face);
    await fireEvent.click(face);
    await tick();
    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    expect(goto).toHaveBeenCalledWith('/program');
  });

  // ── Failure + double-submit guards ────────────────────────

  it('does not navigate when save returns { ok: false } and surfaces an error toast', async () => {
    mockSave.mockResolvedValueOnce({ ok: false, error: 'boom' });
    const SkinPage = await loadPage();
    const { goto } = await import('$app/navigation');
    const { getByTestId, findByText } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face); // activate
    await fireEvent.click(face); // 0→1
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    expect(goto).not.toHaveBeenCalled();
    // Toast renders the strings-layer error message.
    expect(await findByText('Uložení se nezdařilo. Zkus to znovu.')).toBeInTheDocument();

    // Save button is re-enabled so the user can retry.
    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it('double-clicking Uložit only triggers one save call', async () => {
    // Use a never-resolving promise so `saving` stays true between clicks.
    let resolve: ((value: { ok: true; data: undefined }) => void) | undefined;
    mockSave.mockImplementationOnce(
      () => new Promise((r) => {
        resolve = r;
      }),
    );
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face);
    await fireEvent.click(face);
    await tick();

    const save = getByTestId('skin-save');
    await fireEvent.click(save);
    await fireEvent.click(save);
    await tick();

    expect(mockSave).toHaveBeenCalledOnce();
    resolve?.({ ok: true, data: undefined });
  });

  // ── A11y ──────────────────────────────────────────────────

  it('aria-pressed reflects active state on each tile', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    expect(face.getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(face);
    await tick();
    expect(face.getAttribute('aria-pressed')).toBe('true');

    const arms = getByTestId('skin-region-arms');
    await fireEvent.click(arms);
    await tick();
    expect(face.getAttribute('aria-pressed')).toBe('false');
    expect(arms.getAttribute('aria-pressed')).toBe('true');
  });
});
