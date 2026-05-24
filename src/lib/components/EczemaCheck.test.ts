import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import EczemaCheck from './EczemaCheck.svelte';

const baseProps = {
  date: '2026-05-24',
  onSave: () => {},
};

describe('EczemaCheck', () => {
  it('renders status option buttons', () => {
    const { getByText } = render(EczemaCheck, { props: baseProps });
    expect(getByText('Zlepšení')).toBeInTheDocument();
    expect(getByText('Zhoršení')).toBeInTheDocument();
  });

  it('shows notes textarea after selecting a status', async () => {
    const { getByText, getByPlaceholderText } = render(EczemaCheck, { props: baseProps });
    await fireEvent.click(getByText('Zlepšení'));
    await tick();
    expect(getByPlaceholderText(/Poznámka/)).toBeInTheDocument();
  });

  it('notes textarea uses input-base atom', async () => {
    const { getByText, getByPlaceholderText } = render(EczemaCheck, { props: baseProps });
    await fireEvent.click(getByText('Zlepšení'));
    await tick();
    const textarea = getByPlaceholderText(/Poznámka/);
    expect(textarea.className).toMatch(/\binput-base\b/);
  });

  it('calls onSave with assessment data', async () => {
    let saved: unknown;
    const { getByText } = render(EczemaCheck, {
      props: { ...baseProps, onSave: (a: unknown) => { saved = a; } },
    });
    await fireEvent.click(getByText('Zlepšení'));
    await tick();
    await fireEvent.click(getByText('Uložit hodnocení'));
    await tick();
    expect(saved).toMatchObject({ date: '2026-05-24', status: 'improved' });
  });
});
