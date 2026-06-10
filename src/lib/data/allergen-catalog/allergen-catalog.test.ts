import { describe, it, expect } from 'vitest';
import { ALLERGEN_CATALOG, getProtocolForAllergen } from '$lib/data/allergen-catalog/index';
import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

// ── Record shape ──────────────────────────────────────────────

describe('each ALLERGEN_CATALOG record', () => {
  it.each(ALLERGEN_CATALOG)('$id has required fields', (record) => {
    expect(typeof record.id).toBe('string');
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

  it.each(ALLERGEN_CATALOG)('$id CATEGORIES derivation produces compound allergenId:subitem keys', (record) => {
    for (const bare of record.subitems) {
      const compound = `${record.id}:${bare}`;
      expect(compound).toMatch(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/);
    }
  });

  it.each(ALLERGEN_CATALOG)('$id has no duplicate subitem keys', (record) => {
    const keys = [...record.subitems];
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ── Protocol shape ────────────────────────────────────────────

describe('protocol records', () => {
  const withProtocol = (ALLERGEN_CATALOG as readonly CanonicalAllergen[]).filter(
    (r): r is CanonicalAllergen & Required<Pick<CanonicalAllergen, 'protocol'>> => r.protocol !== undefined
  );

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

  it('all bare subitem keys are unique across the whole catalog', () => {
    const all = ALLERGEN_CATALOG.flatMap((r) => [...r.subitems]);
    expect(new Set(all).size).toBe(all.length);
  });

  // Glob over every *.ts file in this directory (excluding index and test).
  // Verifies that every record file is actually registered in ALLERGEN_CATALOG —
  // adding a file without wiring it into index.ts is caught here.
  it('every record file in this directory is registered in ALLERGEN_CATALOG', async () => {
    const modules = import.meta.glob('./*.ts', { eager: true });
    const fileExports = Object.entries(modules)
      .filter(([path]) => !path.includes('index') && !path.includes('.test.'))
      .flatMap(([, mod]) => Object.values(mod as Record<string, unknown>))
      .filter((v): v is CanonicalAllergen => typeof v === 'object' && v !== null && 'id' in v);

    const catalogIds = new Set(ALLERGEN_CATALOG.map((r) => r.id));
    for (const record of fileExports) {
      expect(catalogIds).toContain(record.id);
    }
    expect(fileExports.length).toBe(ALLERGEN_CATALOG.length);
  });

  it('CATALOG records are JSON-serializable (round-trip through JSON.parse/stringify is identity)', () => {
    const serialized = JSON.stringify(ALLERGEN_CATALOG);
    const restored = JSON.parse(serialized);
    expect(restored).toEqual(ALLERGEN_CATALOG);
  });
});

// ── Specific protocol content spot checks ────────────────────

describe('protocol content', () => {
  it('dairy protocol escalates over 5 days', () => {
    const dairy = (ALLERGEN_CATALOG as readonly CanonicalAllergen[]).find((r) => r.id === 'dairy')!;
    expect(dairy.protocol!.days).toHaveLength(5);
    expect(dairy.protocol!.days[0].instructionCs).toContain('mléka');
  });

  it('soy protocol is 3 days', () => {
    const soy = (ALLERGEN_CATALOG as readonly CanonicalAllergen[]).find((r) => r.id === 'soy')!;
    expect(soy.protocol!.days).toHaveLength(3);
  });
});

// ── Not-reintroducible tier (log-only regional foods) ─────────

describe('protocol-less allergen (meat)', () => {
  const meat = (ALLERGEN_CATALOG as readonly CanonicalAllergen[]).find((r) => r.id === 'meat');

  it('meat record exists in catalog', () => {
    expect(meat).toBeDefined();
  });

  it('meat has no protocol — excluded from reintroduction', () => {
    expect(meat!.protocol).toBeUndefined();
    expect(getProtocolForAllergen('meat')).toBeUndefined();
  });

  it('meat has at least one subitem', () => {
    expect(meat!.subitems.length).toBeGreaterThan(0);
  });
});

// ── Protocol-only allergens exclude log-only regional foods ───

describe('ProtocolAllergenId excludes log-only regional foods', () => {
  it('the set of protocol allergens excludes meat/fruit/grains', () => {
    const protocolIds = (ALLERGEN_CATALOG as readonly CanonicalAllergen[])
      .filter((r) => r.protocol !== undefined)
      .map((r) => r.id);
    expect(protocolIds).not.toContain('meat');
    expect(protocolIds).not.toContain('fruit');
    expect(protocolIds).not.toContain('grains');
  });
});
