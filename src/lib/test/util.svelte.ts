import { test } from 'vitest';

/**
 * `$state`/`$derived` read outside a component or `$effect.root` still
 * compute correctly, but nothing marks them dirty on write — there's no
 * reactive context to push the update through. `testWithEffect` runs the
 * test body inside `$effect.root`, giving raw rune logic in `*.svelte.ts`
 * files the reactive context it needs, without mounting a component.
 *
 * Pattern mirrors `svecosystem/runed`'s `testWithEffect`.
 */
export function testWithEffect(name: string, fn: () => void | Promise<void>): void {
  test(name, () => effectRootScope(fn));
}

function effectRootScope(fn: () => void | Promise<void>): void | Promise<void> {
  let promise!: void | Promise<void>;
  const cleanup = $effect.root(() => {
    promise = fn();
  });

  if (promise instanceof Promise) {
    return promise.finally(cleanup);
  } else {
    cleanup();
  }
}
