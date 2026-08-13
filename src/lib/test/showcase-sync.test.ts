import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards against `docs/design/components-showcase.html` drifting from
// `src/lib/components/`: every `sync with:` comment must point at a file
// that still exists. Checks one direction only (showcase → tree) — the
// showcase doesn't document icons, so the reverse isn't asserted.
describe('components-showcase sync', () => {
  it('every "sync with:" path exists on disk', () => {
    const showcasePath = resolve(process.cwd(), 'docs/design/components-showcase.html');
    const showcase = readFileSync(showcasePath, 'utf-8');

    const paths = [
      ...new Set(
        [...showcase.matchAll(/sync with: (src\/lib\/components\/[A-Za-z/-]*\.svelte)/g)].map(
          (match) => match[1]!,
        ),
      ),
    ];

    expect(paths.length).toBeGreaterThan(0);

    const missing = paths.filter((path) => !existsSync(resolve(process.cwd(), path)));

    expect(missing).toEqual([]);
  });
});
