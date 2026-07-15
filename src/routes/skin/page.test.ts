import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { writable } from 'svelte/store';
import type { SkinObservation } from '$lib/domain/models';

// ── Skin observation session mock ─────────────────────────────
const mockSave = vi.fn().mockResolvedValue({ ok: true, data: undefined });
const mockUpdate = vi.fn().mockResolvedValue({ ok: true, data: undefined });
const mockRemove = vi.fn().mockResolvedValue({ ok: true, data: undefined });
const mockRestore = vi.fn().mockResolvedValue({ ok: true, data: undefined });
const mockLoadPhotos = vi.fn().mockResolvedValue({ ok: true, data: [] });
const mockSessionStore = writable<import('$lib/domain/models').SkinObservation[]>([]);
vi.mock('$lib/stores/skin-observation-session', () => ({
  skinObservationSession: {
    subscribe: mockSessionStore.subscribe,
    save: mockSave,
    update: mockUpdate,
    remove: mockRemove,
    restore: mockRestore,
    loadPhotos: mockLoadPhotos,
  },
  createSkinObservationSession: () => ({
    subscribe: mockSessionStore.subscribe,
    save: mockSave,
    update: mockUpdate,
    remove: mockRemove,
    restore: mockRestore,
    loadPhotos: mockLoadPhotos,
  }),
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  beforeNavigate: vi.fn(),
}));

// Discard-buffer mock — the /skin page reads it on mount and writes to it
// on dirty back-out. Tests observe writeBuffer / clearBuffer calls.
const mockDiscardBuffer = writable<import('$lib/stores/discard-buffer').DiscardDescriptor | null>(
  null,
);
const mockWriteBuffer = vi.fn(
  (snapshot: import('$lib/stores/discard-buffer').DiscardDescriptor) => {
    mockDiscardBuffer.set(snapshot);
  },
);
const mockClearBuffer = vi.fn(() => {
  mockDiscardBuffer.set(null);
});
vi.mock('$lib/stores/discard-buffer', () => ({
  get discardBuffer() {
    return mockDiscardBuffer;
  },
  writeBuffer: (snapshot: import('$lib/stores/discard-buffer').DiscardDescriptor) =>
    mockWriteBuffer(snapshot),
  clearBuffer: () => mockClearBuffer(),
}));

// ── Mutable page mock — lets tests control ?date= and ?returnTo= ──
const mockPage = { url: new URL('http://localhost/skin') };
vi.mock('$app/state', () => ({ page: mockPage }));

const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

beforeEach(async () => {
  mockSave.mockClear();
  mockSave.mockResolvedValue({ ok: true, data: undefined });
  mockUpdate.mockClear();
  mockUpdate.mockResolvedValue({ ok: true, data: undefined });
  mockRemove.mockClear();
  mockRemove.mockResolvedValue({ ok: true, data: undefined });
  mockRestore.mockClear();
  mockRestore.mockResolvedValue({ ok: true, data: undefined });
  mockLoadPhotos.mockClear();
  mockLoadPhotos.mockResolvedValue({ ok: true, data: [] });
  mockSessionStore.set([]);
  mockDiscardBuffer.set(null);
  mockWriteBuffer.mockClear();
  mockClearBuffer.mockClear();
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

    for (const label of [
      'Tváře',
      'Vlasová část',
      'Krk',
      'Břicho',
      'Záda',
      'Paže',
      'Loketní jamky',
      'Podkolení',
      'Nohy',
    ]) {
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

  it('Uložit is enabled on page load — every page open can save a no-change klidné observation', async () => {
    // Issue #379: klidné regions are positive evidence. A bare page-open + Uložit
    // saves a "checked, all calm" observation. No taps required.
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
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

  it('Uložit on a freshly-opened page writes all 9 regions at level 0', async () => {
    // Issue #379 / ADR-0021 (klidné amendment): every saved observation is a witness over all
    // nine regions. A no-tap save is "I checked, everything is klidné" —
    // 9 records, every level 0.
    const SkinPage = await loadPage();
    const { getByTestId } = render(SkinPage);
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    expect(mockSave).toHaveBeenCalledOnce();
    const [observation] = mockSave.mock.calls[0]!;
    const obs = observation as SkinObservation;
    expect(obs.regions).toHaveLength(9);
    expect(obs.regions.every((r) => r.level === 0)).toBe(true);
    // All nine canonical region ids must be present.
    const ids = obs.regions.map((r) => r.id).sort();
    expect(ids).toEqual([
      'arms',
      'back',
      'belly',
      'elbow-folds',
      'face',
      'knee-folds',
      'legs',
      'neck',
      'scalp',
    ]);
  });

  it('Uložit triggers save with all 9 regions (one bumped) and an empty photos array', async () => {
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
    const [observation, photos] = mockSave.mock.calls[0]!;
    expect(photos).toEqual([]);
    const obs = observation as SkinObservation;
    // Issue #379: all 9 regions persist; face = mírné (1), other 8 = klidné (0).
    expect(obs.regions).toHaveLength(9);
    expect(obs.regions).toContainEqual({ id: 'face', level: 1 });
    const calmCount = obs.regions.filter((r) => r.level === 0).length;
    expect(calmCount).toBe(8);
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

    const [obs] = mockSave.mock.calls[0]!;
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

    const [obs] = mockSave.mock.calls[0]!;
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

    const [obs] = mockSave.mock.calls[0]!;
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
      () =>
        new Promise((r) => {
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

  it('Uložit stays enabled when a klidné region has ≥1 staged photo', async () => {
    // Issue #379: under option 2 Uložit is always enabled. This test pins the
    // photo path specifically — staging a photo on a klidné region must not
    // regress Uložit's enabled state. (Pre-#379 this guarded the
    // klidné+photo branch of the gate; that gate is gone now.)
    const SkinPage = await loadPage();
    const { getByTestId, container } = render(SkinPage);
    await tick();

    // Activate face but do NOT cycle its level — it stays at klidné (0)
    await fireEvent.click(getByTestId('skin-region-face'));
    await tick();

    const saveBtn = getByTestId('skin-save') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false); // klidné observation alone is savable

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await tick();

    expect(saveBtn.disabled).toBe(false); // still savable with photo attached
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
    const [, photos] = mockSave.mock.calls[0]!;
    expect(photos).toHaveLength(1);
    expect((photos as Array<{ region: string }>)[0]!.region).toBe('face');
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
    await fireEvent.click(
      container.querySelector('[data-testid="skin-photo-delete-0"]') as HTMLElement,
    );
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

    const [, photos] = mockSave.mock.calls[0]!;
    expect(photos).toEqual([]);
  });

  // ── Edit mode (issue #393) ────────────────────────────────

  function makeObs(overrides: Partial<SkinObservation> = {}): SkinObservation {
    return {
      id: 'obs-1',
      date: today,
      createdAt: '2026-06-30T09:12:00.000Z',
      regions: [
        { id: 'face', level: 2 },
        { id: 'arms', level: 0 },
        { id: 'back', level: 0 },
        { id: 'belly', level: 0 },
        { id: 'elbow-folds', level: 0 },
        { id: 'knee-folds', level: 0 },
        { id: 'legs', level: 0 },
        { id: 'neck', level: 0 },
        { id: 'scalp', level: 0 },
      ],
      notes: 'itchy',
      ...overrides,
    };
  }

  it('pre-fills regions and note from the loaded observation when ?id= is valid', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue } = render(SkinPage);
    await tick();
    await tick();

    const face = getByTestId('skin-region-face');
    expect(face.dataset.level).toBe('2');
    await findByDisplayValue('itchy');
  });

  it('bounces to returnTo when ?id= names an unknown observation', async () => {
    mockSessionStore.set([]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=nope&returnTo=/day/${today}`);
    const { goto } = await import('$app/navigation');
    const SkinPage = await loadPage();
    render(SkinPage);
    await waitFor(
      () => expect(goto).toHaveBeenCalledWith(`/day/${today}`, { replaceState: true }),
      { timeout: 2000 },
    );
  });

  it('Uložit is disabled on a clean edit (matches load snapshot)', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save.getAttribute('aria-disabled')).toBe('true');
    // Edit-mode CTA reads "Uložit změny", not "Uložit pozorování".
    expect(save.textContent?.trim()).toBe('Uložit změny');
  });

  it('bumping a region flips dirty=true and enables Uložit', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    // arms starts at level 0 in the fixture; activate + cycle to 1 dirties.
    const arms = getByTestId('skin-region-arms');
    await fireEvent.click(arms); // activate
    await fireEvent.click(arms); // 0→1
    await tick();

    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    expect(save.getAttribute('aria-disabled')).toBe('false');
  });

  it('Uložit calls update() with the preserved id/createdAt and staging options', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    const arms = getByTestId('skin-region-arms');
    await fireEvent.click(arms);
    await fireEvent.click(arms); // 0→1
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    expect(mockUpdate).toHaveBeenCalledOnce();
    const [observation, options] = mockUpdate.mock.calls[0]!;
    const obs = observation as SkinObservation;
    expect(obs.id).toBe('obs-1');
    expect(obs.createdAt).toBe('2026-06-30T09:12:00.000Z');
    expect(obs.regions).toContainEqual({ id: 'arms', level: 1 });
    expect(options).toEqual({ addPhotos: [], removePhotoIds: [] });
  });

  it('editing the note textarea propagates to update() (issue #408 item 8)', async () => {
    mockSessionStore.set([makeObs({ notes: 'staré' })]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('staré');
    await tick();

    const textarea = getByTestId('skin-note') as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: 'nové' } });
    await tick();

    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);

    await fireEvent.click(save);
    await tick();

    expect(mockUpdate).toHaveBeenCalledOnce();
    const [observation] = mockUpdate.mock.calls[0]!;
    expect((observation as SkinObservation).notes).toBe('nové');
  });

  it('renders persisted photos in the gallery on edit-mode load', async () => {
    mockSessionStore.set([makeObs()]);
    mockLoadPhotos.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'photo-a',
          observationId: 'obs-1',
          region: 'face' as const,
          capturedAt: '2026-06-30T09:12:00.000Z',
          blob: new Blob(['a'], { type: 'image/jpeg' }),
        },
      ],
    });
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { container, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    expect(container.querySelector('[data-testid="skin-photo-gallery"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="skin-photo-thumb-0"]')).toBeInTheDocument();
  });

  it('tapping × on a persisted photo greys it and reveals an Undo affordance', async () => {
    mockSessionStore.set([makeObs()]);
    mockLoadPhotos.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'photo-a',
          observationId: 'obs-1',
          region: 'face' as const,
          capturedAt: '2026-06-30T09:12:00.000Z',
          blob: new Blob(['a'], { type: 'image/jpeg' }),
        },
      ],
    });
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { container, findByDisplayValue, getByTestId } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    // × on the persisted photo enters the "marked for removal" state.
    await fireEvent.click(getByTestId('skin-photo-delete-0'));
    await tick();

    const thumb = getByTestId('skin-photo-thumb-0');
    expect(thumb.dataset.markedForRemoval).toBe('true');
    // Undo affordance is now present; × is not.
    expect(container.querySelector('[data-testid="skin-photo-undo-0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="skin-photo-delete-0"]')).toBeNull();
    // Save flips to enabled — a staged removal is a dirty edit.
    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it('tapping Undo restores a persisted photo to active state', async () => {
    mockSessionStore.set([makeObs()]);
    mockLoadPhotos.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'photo-a',
          observationId: 'obs-1',
          region: 'face' as const,
          capturedAt: '2026-06-30T09:12:00.000Z',
          blob: new Blob(['a'], { type: 'image/jpeg' }),
        },
      ],
    });
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { container, findByDisplayValue, getByTestId } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    await fireEvent.click(getByTestId('skin-photo-delete-0')); // mark
    await tick();
    await fireEvent.click(getByTestId('skin-photo-undo-0')); // undo
    await tick();

    const thumb = getByTestId('skin-photo-thumb-0');
    expect(thumb.dataset.markedForRemoval).toBe('false');
    expect(container.querySelector('[data-testid="skin-photo-delete-0"]')).toBeInTheDocument();
    // Save flips back to disabled — undoing the removal restores clean.
    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('Uložit forwards addPhotos + removePhotoIds when both are staged', async () => {
    mockSessionStore.set([makeObs()]);
    mockLoadPhotos.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'photo-a',
          observationId: 'obs-1',
          region: 'face' as const,
          capturedAt: '2026-06-30T09:12:00.000Z',
          blob: new Blob(['a'], { type: 'image/jpeg' }),
        },
      ],
    });
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { container, findByDisplayValue, getByTestId } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    // Stage a removal on the persisted photo.
    await fireEvent.click(getByTestId('skin-photo-delete-0'));
    await tick();
    // Stage an add — activate face first (already at level 2 in the fixture).
    await fireEvent.click(getByTestId('skin-region-face'));
    await tick();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    expect(mockUpdate).toHaveBeenCalledOnce();
    const [, options] = mockUpdate.mock.calls[0]!;
    expect(options.addPhotos).toHaveLength(1);
    expect(options.removePhotoIds).toEqual(['photo-a']);
  });

  it('back arrow on a dirty edit writes a skin-edit descriptor to the discard buffer', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, getByRole, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    // Dirty the edit.
    const arms = getByTestId('skin-region-arms');
    await fireEvent.click(arms);
    await fireEvent.click(arms); // 0→1
    await tick();

    // PageHeader renders the back chevron as a plain button with the ‹ glyph.
    const back = getByRole('button', { name: '‹' });
    await fireEvent.click(back);
    await tick();

    expect(mockWriteBuffer).toHaveBeenCalledOnce();
    const buf = mockWriteBuffer.mock.calls[0]![0];
    if (buf.kind !== 'skin-edit') throw new Error('expected skin-edit descriptor');
    expect(buf.observationId).toBe('obs-1');
  });

  it('back arrow on a clean edit does NOT write to the discard buffer', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByRole, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    const back = getByRole('button', { name: '‹' });
    await fireEvent.click(back);
    await tick();

    expect(mockWriteBuffer).not.toHaveBeenCalled();
  });

  it('re-entry with a matching skin-edit buffer rehydrates the dirty state and clears the buffer', async () => {
    // Seed the persisted row + a matching buffer that carries a bumped level.
    mockSessionStore.set([makeObs()]);
    mockDiscardBuffer.set({
      kind: 'skin-edit',
      observationId: 'obs-1',
      observation: {
        ...makeObs(),
        regions: [
          { id: 'face', level: 2 },
          { id: 'arms', level: 3 }, // dirtied vs load snapshot (arms was 0)
          { id: 'back', level: 0 },
          { id: 'belly', level: 0 },
          { id: 'elbow-folds', level: 0 },
          { id: 'knee-folds', level: 0 },
          { id: 'legs', level: 0 },
          { id: 'neck', level: 0 },
          { id: 'scalp', level: 0 },
        ],
      },
      addPhotos: [],
      removePhotoIds: [],
      date: today,
      returnTo: `/day/${today}`,
    });

    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    // Buffered dirty state is applied — arms shows level 3, not 0.
    const arms = getByTestId('skin-region-arms');
    expect(arms.dataset.level).toBe('3');
    // Uložit is enabled because live !== load snapshot.
    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    // The buffer was cleared on re-entry.
    expect(mockClearBuffer).toHaveBeenCalled();
  });

  // ── Delete + post-delete undo (issue #394) ────────────────

  it('overflow button is absent in compose mode', async () => {
    const SkinPage = await loadPage();
    const { queryByTestId } = render(SkinPage);
    await tick();
    expect(queryByTestId('skin-overflow')).toBeNull();
  });

  it('overflow button appears in edit mode', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    expect(getByTestId('skin-overflow')).toBeInTheDocument();
  });

  it('tapping overflow opens the ConfirmSheet with danger-variant confirm', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue, container } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    await fireEvent.click(getByTestId('skin-overflow'));
    await tick();

    // ConfirmSheet renders backdrop + dialog with the delete heading.
    expect(container.querySelector('[data-testid="confirm-sheet-backdrop"]')).toBeInTheDocument();
    // Danger-variant confirm button.
    const confirm = container.querySelector('[data-variant="danger"]');
    expect(confirm).toBeInTheDocument();
    expect(confirm?.textContent?.trim()).toBe('Smazat pozorování');
  });

  it('ConfirmSheet body mentions that photos will be removed (issue #408 item 9)', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue, findByText } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    await fireEvent.click(getByTestId('skin-overflow'));
    await tick();

    // Body copy must reference fotky — the mother needs to see photos are
    // included in the destructive scope before confirming.
    const { commonStrings } = await import('$lib/strings/common');
    expect(commonStrings.skin.deleteConfirmBody).toMatch(/fotky/i);
    await findByText(commonStrings.skin.deleteConfirmBody);
  });

  it('cancelling the ConfirmSheet closes it with no navigation and no side effect', async () => {
    mockSessionStore.set([makeObs()]);
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const { goto } = await import('$app/navigation');
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue, getByText, container } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    await fireEvent.click(getByTestId('skin-overflow'));
    await tick();

    // Cancel via the visible Zrušit button.
    await fireEvent.click(getByText('Zrušit'));
    await tick();

    expect(container.querySelector('[data-testid="confirm-sheet-backdrop"]')).toBeNull();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockWriteBuffer).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it('confirming delete captures the skin-delete descriptor, calls remove, then navigates', async () => {
    mockSessionStore.set([makeObs()]);
    mockLoadPhotos.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'photo-a',
          observationId: 'obs-1',
          region: 'face' as const,
          capturedAt: '2026-06-30T09:12:00.000Z',
          blob: new Blob(['a'], { type: 'image/jpeg' }),
        },
      ],
    });
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const { goto } = await import('$app/navigation');
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue, container } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    await fireEvent.click(getByTestId('skin-overflow'));
    await tick();

    const confirm = container.querySelector('[data-variant="danger"]') as HTMLButtonElement;
    await fireEvent.click(confirm);
    await tick();
    await tick();

    // Descriptor written before remove; both must have happened.
    expect(mockWriteBuffer).toHaveBeenCalledOnce();
    const desc = mockWriteBuffer.mock.calls[0]![0];
    if (desc.kind !== 'skin-delete') throw new Error('expected skin-delete descriptor');
    expect(desc.observationId).toBe('obs-1');
    expect(desc.observation.id).toBe('obs-1');
    expect(desc.observation.createdAt).toBe('2026-06-30T09:12:00.000Z');
    expect(desc.photoBlobs).toHaveLength(1);
    expect(desc.photoBlobs[0]!.id).toBe('photo-a');
    expect(desc.date).toBe(today);
    expect(desc.returnTo).toBe(`/day/${today}`);

    expect(mockRemove).toHaveBeenCalledWith('obs-1');
    expect(goto).toHaveBeenCalledWith(`/day/${today}`);
  });

  it('remove failure leaves the sheet closed and does not navigate', async () => {
    mockSessionStore.set([makeObs()]);
    mockRemove.mockResolvedValueOnce({ ok: false, error: 'boom' });
    mockPage.url = new URL(`http://localhost/skin?date=${today}&id=obs-1&returnTo=/day/${today}`);
    const { goto } = await import('$app/navigation');
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue, container, findByText } = render(SkinPage);
    await findByDisplayValue('itchy');
    await tick();

    await fireEvent.click(getByTestId('skin-overflow'));
    await tick();

    const confirm = container.querySelector('[data-variant="danger"]') as HTMLButtonElement;
    await fireEvent.click(confirm);
    await tick();

    expect(goto).not.toHaveBeenCalled();
    // Toast surfaces the delete-verb error copy, not the save-verb copy —
    // the mother tapped Smazat, not Uložit (issue #408 item 2).
    const { commonStrings } = await import('$lib/strings/common');
    await findByText(commonStrings.skin.deleteError);
  });

  it('re-entry with a skin-delete descriptor rehydrates as edit mode from the buffer', async () => {
    // Dexie has no row for this id (the observation was hard-deleted). Only
    // the buffer holds its state.
    mockSessionStore.set([]);
    const deletedObs = makeObs({
      id: 'obs-deleted',
      regions: [
        { id: 'face', level: 2 },
        { id: 'arms', level: 1 },
        { id: 'back', level: 0 },
        { id: 'belly', level: 0 },
        { id: 'elbow-folds', level: 0 },
        { id: 'knee-folds', level: 0 },
        { id: 'legs', level: 0 },
        { id: 'neck', level: 0 },
        { id: 'scalp', level: 0 },
      ],
      notes: 'restore me',
    });
    const savedBlob = new Blob(['x'], { type: 'image/jpeg' });
    mockDiscardBuffer.set({
      kind: 'skin-delete',
      observationId: 'obs-deleted',
      observation: deletedObs,
      addPhotos: [],
      removePhotoIds: [],
      photoBlobs: [
        {
          id: 'photo-x',
          observationId: 'obs-deleted',
          region: 'face',
          capturedAt: '2026-06-30T09:12:00.000Z',
          blob: savedBlob,
        },
      ],
      date: today,
      returnTo: `/day/${today}`,
    });

    mockPage.url = new URL(
      `http://localhost/skin?date=${today}&id=obs-deleted&returnTo=/day/${today}`,
    );
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue, container } = render(SkinPage);
    await findByDisplayValue('restore me');
    await tick();

    // Regions restored from the descriptor.
    expect(getByTestId('skin-region-face').dataset.level).toBe('2');
    expect(getByTestId('skin-region-arms').dataset.level).toBe('1');
    // Edit-mode chrome — overflow shows.
    expect(getByTestId('skin-overflow')).toBeInTheDocument();
    // Uložit enabled, and CTA reads "Uložit změny".
    const save = getByTestId('skin-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    expect(save.textContent?.trim()).toBe('Uložit změny');
    // Photos rehydrated.
    expect(container.querySelector('[data-testid="skin-photo-gallery"]')).toBeInTheDocument();
  });

  it('post-delete Uložit calls restore() with original id/createdAt and preserved photo ids', async () => {
    mockSessionStore.set([]);
    const deletedObs = makeObs({
      id: 'obs-deleted',
      createdAt: '2026-06-30T09:12:00.000Z',
      notes: 'restore me',
    });
    const savedBlob = new Blob(['x'], { type: 'image/jpeg' });
    mockDiscardBuffer.set({
      kind: 'skin-delete',
      observationId: 'obs-deleted',
      observation: deletedObs,
      addPhotos: [],
      removePhotoIds: [],
      photoBlobs: [
        {
          id: 'photo-x',
          observationId: 'obs-deleted',
          region: 'face',
          capturedAt: '2026-06-30T09:12:00.000Z',
          blob: savedBlob,
        },
      ],
      date: today,
      returnTo: `/day/${today}`,
    });

    mockPage.url = new URL(
      `http://localhost/skin?date=${today}&id=obs-deleted&returnTo=/day/${today}`,
    );
    const SkinPage = await loadPage();
    const { getByTestId, findByDisplayValue } = render(SkinPage);
    await findByDisplayValue('restore me');
    await tick();

    await fireEvent.click(getByTestId('skin-save'));
    await tick();

    // Update path is NOT used for post-delete-undo — restore is.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRestore).toHaveBeenCalledOnce();
    const [observation, photos] = mockRestore.mock.calls[0]!;
    const obs = observation as SkinObservation;
    expect(obs.id).toBe('obs-deleted');
    expect(obs.createdAt).toBe('2026-06-30T09:12:00.000Z');
    // Photo id is preserved verbatim — this is the whole point of the new verb.
    expect(photos).toHaveLength(1);
    expect(photos[0].id).toBe('photo-x');
    expect(photos[0].observationId).toBe('obs-deleted');
    expect(photos[0].capturedAt).toBe('2026-06-30T09:12:00.000Z');
    // Route passes photos through `$state.snapshot` before `restore` (Svelte
    // proxies would otherwise trip IndexedDB structured-clone). In jsdom the
    // snapshot strips the Blob prototype, so we cannot assert reference or
    // instanceof identity here — id/observationId/capturedAt above already
    // prove the correct row was forwarded. Real DataCloneError coverage lives
    // at the adapter layer.
    expect(photos[0].blob).toBeDefined();
    // Buffer cleared after successful restore.
    expect(mockClearBuffer).toHaveBeenCalled();
  });
});
