import { describe, expect } from 'vitest';

import { testWithEffect } from './util.svelte';

describe('testWithEffect', () => {
  testWithEffect('runs an $effect that reacts to a $state write', async () => {
    let count = $state(0);
    const doubled = $derived(count * 2);
    const seen: number[] = [];

    $effect(() => {
      seen.push(doubled);
    });

    await Promise.resolve();
    expect(seen).toEqual([0]);

    count = 5;
    await Promise.resolve();
    expect(seen).toEqual([0, 10]);
  });
});
