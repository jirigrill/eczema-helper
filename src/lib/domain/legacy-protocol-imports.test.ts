import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Grep-guard for PRD #421: the legacy `AllergenProtocol` / `ProtocolDay` /
 * `getProtocolForAllergen` symbols were deleted in PR B (issue #429). This
 * test asserts nothing under `src/` imports or names them, so a stray revive
 * fails CI rather than silently reintroducing the day-scripted shape.
 */

const SRC = join(process.cwd(), 'src');
const FORBIDDEN = ['AllergenProtocol', 'ProtocolDay', 'getProtocolForAllergen'] as const;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|svelte)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('legacy protocol symbols are gone from src/', () => {
  const files = walk(SRC).filter(f => !f.endsWith('legacy-protocol-imports.test.ts'));

  for (const symbol of FORBIDDEN) {
    it(`no file in src/ names ${symbol}`, () => {
      const offenders = files.filter(f => {
        const text = readFileSync(f, 'utf8');
        return new RegExp(`\\b${symbol}\\b`).test(text);
      });
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
  }
});
