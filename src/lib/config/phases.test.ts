import { describe, it, expect } from 'vitest';
import { phaseConfig } from '$lib/config/phases';
import type { PhaseType } from '$lib/domain/models';

const ALL_TYPES: PhaseType[] = ['reset', 'elimination', 'reintroduction', 'rest', 'tolerance-building'];

describe('config/phases', () => {
  it.each(ALL_TYPES)('"%s" has a non-empty label', (type) => {
    expect(phaseConfig[type].label.length).toBeGreaterThan(0);
  });

  it.each(ALL_TYPES)('"%s" has a non-empty badgeLabel', (type) => {
    expect(phaseConfig[type].badgeLabel.length).toBeGreaterThan(0);
  });

  it.each(ALL_TYPES)('"%s" has a non-empty description', (type) => {
    expect(phaseConfig[type].description.length).toBeGreaterThan(0);
  });

  it.each(ALL_TYPES)('"%s" has a non-empty icon', (type) => {
    expect(phaseConfig[type].icon.length).toBeGreaterThan(0);
  });
});
