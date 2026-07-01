import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { SkinObservation } from '$lib/domain/models';
import { commonStrings } from '$lib/strings/common';
import SkinObservationCard from './SkinObservationCard.svelte';

const DATE = '2026-06-30';

function makeObservation(overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: 'obs-1',
    date: DATE,
    // Local time (no Z) so the rendered HH:MM is timezone-independent.
    createdAt: `${DATE}T10:24:00.000`,
    regions: [{ id: 'face', level: 1 }],
    ...overrides,
  };
}

describe('SkinObservationCard', () => {
  // ── Empty state ─────────────────────────────────────────────
  it('empty state: renders prefix text + CTA link to /skin?date=…&returnTo=/day/…', async () => {
    const { container, getByText, getByRole } = render(SkinObservationCard, {
      props: { observations: [], date: DATE },
    });
    await tick();

    // Section label is present.
    expect(getByText(commonStrings.today.eczemaStatusLabel)).toBeInTheDocument();
    // Prefix text (muted) appears verbatim.
    expect(container.textContent).toContain(commonStrings.today.eczemaStatusEmpty);
    // CTA is the only <a> in the card, with the right text and href.
    const link = getByRole('link', { name: commonStrings.today.eczemaStatusEmptyCta });
    expect(link.getAttribute('href')).toBe(`/skin?date=${DATE}&returnTo=/day/${DATE}`);
  });

  // ── One mírné observation ───────────────────────────────────
  it('one mírné observation: time column + single Tváře chip with severity-1 tint; no row-overall label', async () => {
    const obs = makeObservation({
      createdAt: `${DATE}T10:24:00.000`,
      regions: [{ id: 'face', level: 1 }],
    });
    const { container, getByText, queryByText } = render(SkinObservationCard, {
      props: { observations: [obs], date: DATE },
    });
    await tick();

    // Exactly one observation row.
    const rows = container.querySelectorAll('[data-testid="skin-observation-row"]');
    expect(rows).toHaveLength(1);

    // Time column: tabular-nums, matches "10:24".
    const timeCol = rows[0].querySelector('.tabular-nums');
    expect(timeCol?.textContent?.trim()).toMatch(/^10:24$/);

    // Exactly one chip in the row, text "Tváře".
    const chips = rows[0].querySelectorAll('[data-testid="skin-chip"]');
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent?.trim()).toBe('Tváře');

    // Chip carries severity-1 tint (bg-warning/15 from severityConfig[1].tileBg).
    expect(chips[0].className).toContain('bg-warning/15');

    // No row-overall severity label leaked: the capitalized word "Mírné"
    // must not appear in the row.
    expect(queryByText('Mírné')).toBeNull();
    // bumpedRegions-style joined text must not appear either (regions are
    // chips now, not a secondary line).
    expect(rows[0].textContent).not.toContain('Tváře ·');

    // No italic third line (no notes).
    expect(rows[0].querySelector('.italic')).toBeNull();
    // Sanity: no empty-state text leaked in.
    expect(queryByText(commonStrings.today.eczemaStatusEmpty)).toBeNull();

    // Single-chip, no-note row uses items-center alignment (per issue spec).
    expect(rows[0].className).toContain('items-center');

    // getByText used to confirm the chip is reachable by its visible text.
    expect(getByText('Tváře')).toBeInTheDocument();
  });

  // ── Mixed-severity observation: per-region chips, canonical order ──
  it('mixed-severity observation (face=silné, belly=mírné): two chips in REGION_IDS order, each per-region tinted; no row-overall label', async () => {
    // Input deliberately reverses canonical order (belly index 3, face index 0)
    // so the test pins that chips render in REGION_IDS order regardless.
    const obs = makeObservation({
      regions: [
        { id: 'belly', level: 1 },
        { id: 'face', level: 3 },
      ],
    });
    const { container, queryByText } = render(SkinObservationCard, {
      props: { observations: [obs], date: DATE },
    });
    await tick();

    const rows = container.querySelectorAll('[data-testid="skin-observation-row"]');
    expect(rows).toHaveLength(1);

    const chips = rows[0].querySelectorAll('[data-testid="skin-chip"]');
    expect(chips).toHaveLength(2);

    // REGION_IDS order: face (0) comes before belly (3).
    expect(chips[0].textContent?.trim()).toBe('Tváře');
    expect(chips[1].textContent?.trim()).toBe('Břicho');

    // Per-region tint: face=silné (level 3 → bg-danger/60),
    //                  belly=mírné (level 1 → bg-warning/15).
    // (Severity-tier alphas: /15 mírné · /45 střední · /60 silné — the
    // gradient is calibrated so chips read at a glance against white.)
    expect(chips[0].className).toContain('bg-danger/60');
    expect(chips[1].className).toContain('bg-warning/15');

    // No row-overall label: neither "Silné" nor "Mírné" capitalized appears
    // as standalone text outside the chips.
    expect(queryByText('Silné')).toBeNull();
    expect(queryByText('Mírné')).toBeNull();
  });

  // ── One klidné observation — single neutral "Vše klidné" chip ──
  it('klidné observation (zero bumped regions): single neutral "Vše klidné" chip, no severity-tinted chip, no standalone "Klidné" label', async () => {
    const klidne = makeObservation({
      // All 9 regions at klidné — the persisted shape per ADR-0021 (klidné amendment).
      regions: [
        { id: 'face', level: 0 },
        { id: 'scalp', level: 0 },
        { id: 'neck', level: 0 },
        { id: 'belly', level: 0 },
        { id: 'back', level: 0 },
        { id: 'arms', level: 0 },
        { id: 'elbow-folds', level: 0 },
        { id: 'knee-folds', level: 0 },
        { id: 'legs', level: 0 },
      ],
    });
    const { container, queryByText } = render(SkinObservationCard, {
      props: { observations: [klidne], date: DATE },
    });
    await tick();

    const rows = container.querySelectorAll<HTMLElement>('[data-testid="skin-observation-row"]');
    expect(rows).toHaveLength(1);

    // Exactly one chip; text is the new card-specific copy.
    const chips = rows[0].querySelectorAll('[data-testid="skin-chip"]');
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent?.trim()).toBe(commonStrings.today.eczemaAllCalmChip);
    expect(chips[0].textContent?.trim()).toBe('Vše klidné');

    // Klidné chip uses severityConfig[0].dot (bg-surface-dark) as its
    // neutral background, NOT any of the severity 1/2/3 tints.
    expect(chips[0].className).toContain('bg-surface-dark');
    expect(chips[0].className).not.toContain('bg-warning');
    expect(chips[0].className).not.toContain('bg-severity-4');
    expect(chips[0].className).not.toContain('bg-danger');

    // No standalone capitalized "Klidné" text (the chip carries the meaning,
    // and "Vše klidné" is the only Czech surface).
    expect(queryByText('Klidné')).toBeNull();

    // No-notes klidné row → items-center alignment.
    expect(rows[0].className).toContain('items-center');
    expect(rows[0].className).not.toContain('items-start');
  });

  // ── Three mixed observations — sort ascending, chip shapes per row ──
  it('three mixed observations: sorted ascending by createdAt; klidné = neutral chip; střední = two chips in canonical order + italic note; mírné = single chip', async () => {
    const mirne = makeObservation({
      id: 'mirne',
      createdAt: `${DATE}T19:45:00.000`,
      regions: [{ id: 'face', level: 1 }],
    });
    const klidne = makeObservation({
      id: 'klidne',
      createdAt: `${DATE}T09:12:00.000`,
      regions: [{ id: 'face', level: 0 }, { id: 'belly', level: 0 }],
    });
    const stredni = makeObservation({
      id: 'stredni',
      createdAt: `${DATE}T14:30:00.000`,
      regions: [{ id: 'elbow-folds', level: 2 }, { id: 'neck', level: 2 }],
      notes: 'po obědě',
    });
    const { container, queryByText } = render(SkinObservationCard, {
      // Intentionally NON-ascending input order.
      props: { observations: [mirne, klidne, stredni], date: DATE },
    });
    await tick();

    const rows = container.querySelectorAll<HTMLElement>('[data-testid="skin-observation-row"]');
    expect(rows).toHaveLength(3);

    // Read times top-to-bottom; assert ascending order regardless of input order.
    const times = Array.from(rows).map((row) =>
      row.querySelector('.tabular-nums')?.textContent?.trim()
    );
    expect(times).toEqual(['9:12', '14:30', '19:45']);

    // Row 1 (klidné, 9:12): items-center, single neutral "Vše klidné" chip.
    expect(rows[0].className).toContain('items-center');
    const row0Chips = rows[0].querySelectorAll('[data-testid="skin-chip"]');
    expect(row0Chips).toHaveLength(1);
    expect(row0Chips[0].textContent?.trim()).toBe('Vše klidné');
    expect(row0Chips[0].className).toContain('bg-surface-dark');

    // Row 2 (střední, 14:30): items-start (has notes); two chips in canonical
    // REGION_IDS order — neck (index 2) before elbow-folds (index 6) — both
    // tinted with severity-4 (level 2); italic note line.
    expect(rows[1].className).toContain('items-start');
    const row1Chips = rows[1].querySelectorAll('[data-testid="skin-chip"]');
    expect(row1Chips).toHaveLength(2);
    expect(row1Chips[0].textContent?.trim()).toBe('Krk');
    expect(row1Chips[1].textContent?.trim()).toBe('Loketní jamky');
    expect(row1Chips[0].className).toContain('bg-severity-4/45');
    expect(row1Chips[1].className).toContain('bg-severity-4/45');
    const note = rows[1].querySelector('.italic');
    expect(note?.textContent).toBe('„po obědě"');

    // Row 3 (mírné, 19:45): items-center (no notes); single warning-tinted chip.
    expect(rows[2].className).toContain('items-center');
    const row2Chips = rows[2].querySelectorAll('[data-testid="skin-chip"]');
    expect(row2Chips).toHaveLength(1);
    expect(row2Chips[0].textContent?.trim()).toBe('Tváře');
    expect(row2Chips[0].className).toContain('bg-warning/15');

    // No capitalized row-overall labels anywhere in the card.
    expect(queryByText('Klidné')).toBeNull();
    expect(queryByText('Střední')).toBeNull();
    expect(queryByText('Mírné')).toBeNull();
  });

  // ── Header has no record count ─────────────────────────────
  it('renders no "N záznam(y/ů)" count in the card header', async () => {
    const obs1 = makeObservation({ id: 'a' });
    const obs2 = makeObservation({ id: 'b', createdAt: `${DATE}T11:00:00.000` });
    const obs3 = makeObservation({ id: 'c', createdAt: `${DATE}T13:00:00.000` });
    const { container, queryByTestId } = render(SkinObservationCard, {
      props: { observations: [obs1, obs2, obs3], date: DATE },
    });
    await tick();

    // Negative assertion: no Czech-pluralised záznam(y/ů) anywhere in the card.
    expect(container.textContent).not.toMatch(/\d+\s+záznam/);
    // DayCard's right-slot testid must be absent (no Snippet was passed).
    expect(queryByTestId('day-card-right')).toBeNull();
  });

  // ── Rows are edit-mode links ────────────────────────────────
  it('observation rows are <a> elements linking to /skin with date, id, and returnTo', async () => {
    const obsA = makeObservation({ id: 'obs-a', regions: [{ id: 'face', level: 1 }] });
    const obsB = makeObservation({
      id: 'obs-b',
      createdAt: `${DATE}T11:00:00.000`,
      regions: [{ id: 'belly', level: 2 }],
    });
    const { container } = render(SkinObservationCard, {
      props: { observations: [obsA, obsB], date: DATE },
    });
    await tick();

    const rows = container.querySelectorAll<HTMLElement>('[data-testid="skin-observation-row"]');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      // The row IS the anchor (testid moved onto the <a>).
      expect(row.tagName).toBe('A');
    }
    // Each anchor points to /skin with the observation's own date + id +
    // a returnTo pointing back to the day it was rendered on.
    expect(rows[0].getAttribute('href')).toBe(
      `/skin?date=${DATE}&id=obs-a&returnTo=/day/${DATE}`
    );
    expect(rows[1].getAttribute('href')).toBe(
      `/skin?date=${DATE}&id=obs-b&returnTo=/day/${DATE}`
    );
    // Empty-state CTA must be gone (observations exist), so the only anchors
    // in the card are the observation rows themselves.
    expect(container.querySelectorAll('a')).toHaveLength(2);
  });

  // ── Notes optional ─────────────────────────────────────────
  it('observation without notes renders no italic third line; empty-string notes is also skipped', async () => {
    const undefinedNotes = makeObservation({ id: 'u', regions: [{ id: 'face', level: 1 }] });
    const emptyNotes = makeObservation({
      id: 'e',
      createdAt: `${DATE}T11:00:00.000`,
      regions: [{ id: 'face', level: 1 }],
      notes: '',
    });
    const { container } = render(SkinObservationCard, {
      props: { observations: [undefinedNotes, emptyNotes], date: DATE },
    });
    await tick();

    const rows = container.querySelectorAll<HTMLElement>('[data-testid="skin-observation-row"]');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.querySelector('.italic')).toBeNull();
    }
  });
});
