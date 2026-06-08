import { describe, it, expect } from 'vitest';
import { ALLERGEN_CATALOG } from '$lib/data/allergen-catalog/index';

// ── Record shape ──────────────────────────────────────────────

describe('each ALLERGEN_CATALOG record', () => {
  it.each(ALLERGEN_CATALOG)('$id has required fields', (record) => {
    expect(typeof record.id).toBe('string');
    expect(record.origin === 'core' || record.origin === 'regional').toBe(true);
    expect(typeof record.icon).toBe('string');
    expect(Array.isArray(record.aliases)).toBe(true);
    expect(Array.isArray(record.subitems)).toBe(true);
  });

  it.each(ALLERGEN_CATALOG)('$id subitems are bare keys (no allergenId: prefix)', (record) => {
    for (const bare of record.subitems) {
      expect(bare).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(bare).not.toContain(':');
    }
  });

  it.each(ALLERGEN_CATALOG)('$id has no duplicate subitem ids', (record) => {
    const ids = [...record.subitems];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Protocol shape ────────────────────────────────────────────

describe('protocol records', () => {
  const withProtocol = ALLERGEN_CATALOG.filter((r) => r.protocol !== undefined);

  it('at least one allergen has a protocol', () => {
    expect(withProtocol.length).toBeGreaterThan(0);
  });

  it.each(withProtocol)('$id protocol has at least one day', (record) => {
    expect(record.protocol!.days.length).toBeGreaterThan(0);
  });

  it.each(withProtocol)('$id protocol ends with exactly one evaluation day', (record) => {
    const days = record.protocol!.days;
    const evaluationDays = days.filter((d) => d.isEvaluationDay);
    expect(evaluationDays).toHaveLength(1);
    expect(days[days.length - 1].isEvaluationDay).toBe(true);
  });

  it.each(withProtocol)('$id protocol days are numbered sequentially from 1', (record) => {
    record.protocol!.days.forEach((d, i) => {
      expect(d.day).toBe(i + 1);
    });
  });

  it.each(withProtocol)('$id protocol day instructions are non-empty Czech strings', (record) => {
    for (const day of record.protocol!.days) {
      expect(day.instructionCs.trim().length).toBeGreaterThan(0);
    }
  });
});

// ── Catalog integrity ─────────────────────────────────────────

describe('ALLERGEN_CATALOG integrity', () => {
  it('all allergen ids are unique', () => {
    const ids = ALLERGEN_CATALOG.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all subitem ids across the whole catalog are unique', () => {
    const all = ALLERGEN_CATALOG.flatMap((r) => [...r.subitems]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('known allergens are present', () => {
    const ids = ALLERGEN_CATALOG.map((r) => r.id);
    const expected = [
      'dairy', 'eggs', 'wheat', 'soy', 'nuts', 'fish', 'shellfish',
      'citrus', 'chocolate', 'tomatoes', 'strawberries', 'corn', 'sesame',
    ];
    for (const id of expected) {
      expect(ids).toContain(id);
    }
  });
});

// ── Specific protocol content spot checks ────────────────────

describe('protocol content', () => {
  it('dairy protocol escalates over 5 days', () => {
    const dairy = ALLERGEN_CATALOG.find((r) => r.id === 'dairy')!;
    expect(dairy.protocol!.days).toHaveLength(5);
    expect(dairy.protocol!.days[0].instructionCs).toContain('mléka');
  });

  it('soy protocol is 3 days', () => {
    const soy = ALLERGEN_CATALOG.find((r) => r.id === 'soy')!;
    expect(soy.protocol!.days).toHaveLength(3);
  });
});
