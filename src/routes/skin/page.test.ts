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

const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

  // ── Severity-coloured border (AC4) ───────────────────────
  //
  // The strict visual claim from #361: a logged-but-inactive region shows its
  // severity-colour border; a never-touched calm region shows the hairline
  // (surface-dark); active beats both with `border-primary`. We assert the
  // exact `tileBorder` token from `severityConfig` per level so a token rename
  // breaks the test, not just the look.

  it('inactive tiles render the severity-colour border that matches their level', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    const arms = getByTestId('skin-region-arms');
    const belly = getByTestId('skin-region-belly');
    const legs = getByTestId('skin-region-legs');

    // Cycle face to mírné (1), arms to střední (2), belly to silné (3),
    // leaving legs at klidné (0). Switch active off all of them onto a
    // sentinel region so each tile under test is "logged but inactive".
    await fireEvent.click(face); // activate
    await fireEvent.click(face); // 0→1
    await fireEvent.click(arms); // activate
    await fireEvent.click(arms); // 0→1
    await fireEvent.click(arms); // 1→2
    await fireEvent.click(belly); // activate
    await fireEvent.click(belly); // 0→1
    await fireEvent.click(belly); // 1→2
    await fireEvent.click(belly); // 2→3
    // Park active on legs (still level 0) so the other three tiles are
    // logged-but-inactive — the case AC4 is about.
    await fireEvent.click(legs);
    await tick();

    // Hairline for the never-touched calm region. legs is currently active
    // so it picks up `border-primary`; pick a different never-touched tile.
    const neck = getByTestId('skin-region-neck');
    expect(neck.className).toContain('border-surface-dark');
    expect(neck.dataset.level).toBe('0');

    expect(face.className).toContain('border-warning/50');
    expect(arms.className).toContain('border-severity-4/50');
    expect(belly.className).toContain('border-danger/50');
  });

  it('active tile uses border-primary regardless of its level', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face); // activate at level 0
    await tick();
    expect(face.className).toContain('border-primary');
    // The level-coloured token must not also be present — `border-primary`
    // is the override, not an additional border.
    expect(face.className).not.toContain('border-surface-dark');

    await fireEvent.click(face); // 0→1, still active
    await tick();
    expect(face.className).toContain('border-primary');
    expect(face.className).not.toContain('border-warning/50');
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

  // ── Photo staging ─────────────────────────────────────────

  it('photo button is absent when no region is active', async () => {
    const SkinPage = await loadPage();
    const { queryByTestId } = render(SkinPage);
    await tick();
    expect(queryByTestId('skin-add-photo')).toBeNull();
  });

  it('photo button appears when a region is active', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    await fireEvent.click(getByTestId('skin-region-face')); // activate
    await tick();

    const btn = getByTestId('skin-add-photo');
    expect(btn).toBeInTheDocument();
  });

  it('photo button label includes the active region Czech name', async () => {
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    await fireEvent.click(getByTestId('skin-region-face'));
    await tick();

    // regionStrings.face.label = 'Tváře'
    expect(getByTestId('skin-add-photo').textContent).toContain('Tváře');
  });

  it('photo button has no capture attribute', async () => {
    const SkinPage = await loadPage();
    const { getByTestId, container } = render(SkinPage);
    await tick();

    await fireEvent.click(getByTestId('skin-region-face'));
    await tick();

    // The file input linked to the button must not have a capture attribute.
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    expect(fileInput!.hasAttribute('capture')).toBe(false);
  });

  it('adding files stages them with the currently active region', async () => {
    const SkinPage = await loadPage();
    const { getByTestId, container } = render(SkinPage);
    await tick();

    await fireEvent.click(getByTestId('skin-region-arms')); // activate arms
    await tick();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await tick();

    // Gallery should now show the photo with the arms region label
    expect(container.querySelector('[data-testid="skin-photo-gallery"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="skin-photo-thumb-0"]')).toBeInTheDocument();
  });

  it('klidné region (level 0) with ≥1 staged photo enables Uložit', async () => {
    const SkinPage = await loadPage();
    const { getByTestId, container } = render(SkinPage);
    await tick();

    // Activate face but do NOT cycle its level — it stays at klidné (0)
    await fireEvent.click(getByTestId('skin-region-face'));
    await tick();

    const saveBtn = getByTestId('skin-save') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true); // no level > 0, no photos yet

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await tick();

    expect(saveBtn.disabled).toBe(false); // klidné + photo → canSave
  });

  it('Uložit passes staged photos to save', async () => {
    const SkinPage = await loadPage();
    const { getByTestId, container } = render(SkinPage);
    await tick();

    // Stage a photo on 'face' (level stays 0)
    await fireEvent.click(getByTestId('skin-region-face'));
    await tick();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    expect(mockSave).toHaveBeenCalledOnce();
    const [, photos] = mockSave.mock.calls[0];
    expect(photos).toHaveLength(1);
    expect((photos as Array<{ region: string }>)[0].region).toBe('face');
  });

  it('deleting a staged photo removes it from the gallery', async () => {
    const SkinPage = await loadPage();
    const { getByTestId, container } = render(SkinPage);
    await tick();

    await fireEvent.click(getByTestId('skin-region-face'));
    await tick();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await tick();
    expect(container.querySelector('[data-testid="skin-photo-gallery"]')).toBeInTheDocument();

    // Delete it
    await fireEvent.click(container.querySelector('[data-testid="skin-photo-delete-0"]') as HTMLElement);
    await tick();

    expect(container.querySelector('[data-testid="skin-photo-gallery"]')).toBeNull();
  });

  it('Uložit triggers save with regions and empty photos when no photos staged', async () => {
    // Existing behaviour must not regress: empty array when no photos staged.
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const face = getByTestId('skin-region-face');
    await fireEvent.click(face);
    await fireEvent.click(face); // 0→1
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    const [, photos] = mockSave.mock.calls[0];
    expect(photos).toEqual([]);
  });
});
