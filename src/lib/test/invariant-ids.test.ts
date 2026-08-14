import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the `INV-<n>` ids in `CONTEXT.md` § Invariants. Specs cite invariants
// by id (`CONTEXT.md#inv-4`), so an id that shifts silently retargets every
// citation elsewhere — including in repos that don't share this test suite.
// The ids are permanent identity, not position: assigned once, never reused,
// never renumbered.
//
// Insertion is allowed (append the next unused number); reassignment is not.
// When a genuinely new invariant lands, extend `ASSIGNED` — never edit an
// existing entry.
const ASSIGNED: Record<number, string> = {
  1: 'Single device',
  2: 'No backup mechanism exists, and none is planned',
  3: 'Meals are day-granular',
  4: 'One `Meal` per date+mealType+actor slot',
  5: 'Causation is derived, not recorded',
  6: 'Skin observation is a per-region severity set',
  7: 'Klidné regions persist as positive evidence',
  8: 'Observation `id` and `createdAt` are immutable',
  9: 'Photos are stored unencrypted at rest',
  10: 'Persistence: Dexie/IndexedDB, normalized tables',
  11: 'The app is a Logging Tool',
  12: 'Domain records carry types, not display strings',
  13: 'Food catalog is data-first and bundled',
  14: 'Every `Meal` has an eligible `actor`',
};

// Bullets carry their anchor inline (`- <a id="inv-4"></a>**INV-4 — …`) rather
// than in a preceding block: a standalone anchor between list items splits the
// list into two `<ul>`s on GitHub.
const BULLET = /^- (?:<a id="inv-\d+"><\/a>)?\*\*(.*?)(?:\.|\*\*| —)/gm;
const NUMBERED_BULLET = /^- (?:<a id="inv-\d+"><\/a>)?\*\*INV-(\d+) —/gm;

function readInvariantsSection(): string {
  const context = readFileSync(resolve(process.cwd(), 'CONTEXT.md'), 'utf-8');
  const start = context.indexOf('\n## Invariants\n');

  expect(start).toBeGreaterThan(-1);

  return context.slice(start);
}

describe('CONTEXT.md invariant ids', () => {
  it('numbers every bullet in the Invariants section', () => {
    const section = readInvariantsSection();

    const bullets = [...section.matchAll(BULLET)].map((match) => match[1]!);
    const unnumbered = bullets.filter((bullet) => !/^INV-\d+$/.test(bullet));

    expect(unnumbered).toEqual([]);
  });

  it('assigns each id exactly once', () => {
    const ids = [...readInvariantsSection().matchAll(NUMBERED_BULLET)].map((match) =>
      Number(match[1]),
    );

    expect(ids.length).toBe(new Set(ids).size);
    expect(ids.length).toBe(Object.keys(ASSIGNED).length);
  });

  it('never renumbers an already-assigned id', () => {
    const section = readInvariantsSection();

    const drifted = Object.entries(ASSIGNED).filter(
      ([id, gist]) => !section.includes(`**INV-${id} — ${gist}`),
    );

    expect(drifted).toEqual([]);
  });

  it('gives every id a linkable anchor', () => {
    const section = readInvariantsSection();

    const missing = Object.keys(ASSIGNED).filter(
      (id) => !section.includes(`<a id="inv-${id}"></a>`),
    );

    expect(missing).toEqual([]);
  });
});
