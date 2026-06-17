import { describe, it, expect } from 'vitest';
import { formPreparations, formForFood } from './preparation-rules';

describe('formPreparations', () => {
  it('none → no chips', () => {
    expect(formPreparations.none).toEqual([]);
  });

  it('liquid → raw, boiled, baked', () => {
    expect(formPreparations.liquid).toEqual(['raw', 'boiled', 'baked']);
  });

  it('cookable → all four chips including raw', () => {
    expect(formPreparations.cookable).toEqual([
      'raw',
      'boiled',
      'baked',
      'fried',
    ]);
  });

  it('raw-only → only raw', () => {
    expect(formPreparations['raw-only']).toEqual(['raw']);
  });
});

describe('formForFood', () => {
  it('returns the catalog form for a known food', () => {
    expect(formForFood('voda')).toBe('none');
    expect(formForFood('kravske-mleko')).toBe('liquid');
    expect(formForFood('brambory')).toBe('cookable');
    expect(formForFood('spenat')).toBe('raw-only');
  });

  it('defaults custom (other:*) and unknown foods to cookable', () => {
    expect(formForFood('other:moje-jidlo')).toBe('cookable');
    expect(formForFood('totally-unknown-id')).toBe('cookable');
  });
});
