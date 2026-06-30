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
  it('one mírné observation: time column, severity dot, capitalized label, region secondary line', async () => {
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

    // Time column: tabular-nums, matches "10:24" (no leading zero in spec for 1-digit hours).
    const timeCol = rows[0].querySelector('.tabular-nums');
    expect(timeCol).not.toBeNull();
    expect(timeCol?.textContent?.trim()).toMatch(/^10:24$/);

    // Severity dot uses severityConfig[1].dot (bg-warning).
    const dot = rows[0].querySelector('span.bg-warning');
    expect(dot).not.toBeNull();

    // Primary line: capitalized "Mírné".
    expect(getByText('Mírné')).toBeInTheDocument();

    // Secondary line: region label.
    expect(getByText('Tváře')).toBeInTheDocument();

    // No italic third line (no notes).
    expect(rows[0].querySelector('.italic')).toBeNull();
    // Sanity: no empty-state text leaked in.
    expect(queryByText(commonStrings.today.eczemaStatusEmpty)).toBeNull();
  });

  // ── One klidné observation — single line, items-center ──────
  it('one klidné observation: single-line row (items-center), no secondary line, klidné label', async () => {
    const klidne = makeObservation({
      // All 9 regions at klidné — the persisted shape per ADR-0022.
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
    const { container, getByText } = render(SkinObservationCard, {
      props: { observations: [klidne], date: DATE },
    });
    await tick();

    const rows = container.querySelectorAll<HTMLElement>('[data-testid="skin-observation-row"]');
    expect(rows).toHaveLength(1);

    // Single-line shape → items-center, no items-start.
    expect(rows[0].className).toContain('items-center');
    expect(rows[0].className).not.toContain('items-start');

    // Klidné label (capitalized).
    expect(getByText('Klidné')).toBeInTheDocument();

    // No secondary region line — the row's inner column has only the primary
    // line wrapper. Assert by querying inside the row's content column.
    const secondary = rows[0].querySelector('.text-\\[11px\\]:not(.italic)');
    expect(secondary).toBeNull();
  });

  // ── Three mixed observations — sort ascending ───────────────
  it('three mixed observations: sorted ascending by createdAt; klidné single-line; střední has region + italic note', async () => {
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
    const { container, getByText } = render(SkinObservationCard, {
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

    // Row 1 (klidné, 9:12): items-center, no secondary line.
    expect(rows[0].className).toContain('items-center');
    expect(rows[0].querySelector('.text-\\[11px\\]:not(.italic)')).toBeNull();

    // Row 2 (střední, 14:30): secondary region line + italic note.
    expect(rows[1].className).toContain('items-start');
    const secondary = rows[1].querySelector('.text-\\[11px\\]:not(.italic)');
    expect(secondary?.textContent).toBe('Loketní jamky · Krk');
    const note = rows[1].querySelector('.italic');
    expect(note?.textContent).toBe('„po obědě"');

    // Row 3 (mírné, 19:45): items-start (has region secondary line).
    expect(rows[2].className).toContain('items-start');

    // Sanity: capitalized severity labels still appear.
    expect(getByText('Klidné')).toBeInTheDocument();
    expect(getByText('Střední')).toBeInTheDocument();
    expect(getByText('Mírné')).toBeInTheDocument();
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

  // ── Rows are read-only ──────────────────────────────────────
  it('observation rows are not wrapped in anchors (read-only)', async () => {
    const obs = makeObservation({ regions: [{ id: 'face', level: 1 }] });
    const { container } = render(SkinObservationCard, {
      props: { observations: [obs], date: DATE },
    });
    await tick();

    const rows = container.querySelectorAll<HTMLElement>('[data-testid="skin-observation-row"]');
    expect(rows).toHaveLength(1);
    for (const row of rows) {
      // No <a> may be an ancestor of an observation row.
      expect(row.closest('a')).toBeNull();
    }
    // And since observations exist, the empty-state CTA must be gone too →
    // there are zero <a> elements anywhere in the card.
    expect(container.querySelectorAll('a')).toHaveLength(0);
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
