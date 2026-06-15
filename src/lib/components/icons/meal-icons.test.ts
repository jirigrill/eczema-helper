import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { SunriseIcon, SunIcon, AppleIcon, MoonIcon } from './index';

describe('meal-type SVG icons', () => {
  const cases = [
    { name: 'SunriseIcon', component: SunriseIcon },
    { name: 'SunIcon',     component: SunIcon     },
    { name: 'AppleIcon',   component: AppleIcon   },
    { name: 'MoonIcon',    component: MoonIcon    },
  ] as const;

  for (const { name, component } of cases) {
    it(`${name} renders an <svg> using currentColor (single-color via parent text-* class)`, async () => {
      const { container } = render(component);
      await tick();
      const svg = container.querySelector('svg');
      expect(svg, `${name} must render an <svg> root`).not.toBeNull();
      // Every paint attribute on the svg or its painted children must be either
      // unset or 'currentColor'/'none' — no hard-coded hex/rgb/named colors.
      const painted = [svg!, ...svg!.querySelectorAll('[fill],[stroke]')];
      for (const el of painted) {
        for (const attr of ['fill', 'stroke'] as const) {
          const v = el.getAttribute(attr);
          if (v == null) continue;
          expect(['currentColor', 'none'], `${name}: ${attr}="${v}" must be currentColor or none`).toContain(v);
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
