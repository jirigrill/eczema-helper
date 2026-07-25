import { tick } from 'svelte';

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import { BabyIcon, MotherIcon } from './index';

describe('actor SVG icons (dual-actor day-view marker, #570)', () => {
  const cases = [
    { name: 'MotherIcon', component: MotherIcon },
    { name: 'BabyIcon', component: BabyIcon },
  ] as const;

  for (const { name, component } of cases) {
    it(`${name} renders an <svg> using only currentColor/none paints`, async () => {
      const { container } = render(component);
      await tick();
      const svg = container.querySelector('svg');
      expect(svg, `${name} must render an <svg> root`).not.toBeNull();
      const painted = [svg!, ...svg!.querySelectorAll('[fill],[stroke]')];
      for (const el of painted) {
        for (const attr of ['fill', 'stroke'] as const) {
          const v = el.getAttribute(attr);
          if (v == null) continue;
          expect(
            ['currentColor', 'none'],
            `${name}: ${attr}="${v}" must be currentColor or none`,
          ).toContain(v);
        }
      }
    });

    it(`${name} forwards class prop to the <svg> root`, async () => {
      const { container } = render(component, { props: { class: 'w-5 h-5 text-primary' } });
      await tick();
      const svg = container.querySelector('svg');
      expect(svg!.getAttribute('class')).toContain('w-5');
      expect(svg!.getAttribute('class')).toContain('h-5');
      expect(svg!.getAttribute('class')).toContain('text-primary');
    });
  }
});
