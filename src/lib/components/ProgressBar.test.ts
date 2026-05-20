import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ProgressBar from './ProgressBar.svelte';

describe('ProgressBar', () => {
  it('renders without throwing', () => {
    expect(() => render(ProgressBar, { props: { value: 50 } })).not.toThrow();
  });

  it('applies the value as inline width', () => {
    const { container } = render(ProgressBar, { props: { value: 75 } });
    const fill = container.querySelector('[style]');
    expect(fill?.getAttribute('style')).toContain('75%');
  });

  it('renders at 0% without throwing', () => {
    expect(() => render(ProgressBar, { props: { value: 0 } })).not.toThrow();
  });

  it('renders at 100% without throwing', () => {
    expect(() => render(ProgressBar, { props: { value: 100 } })).not.toThrow();
  });
});
