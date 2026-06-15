import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import FabActionSheet from './FabActionSheet.svelte';
import * as navigation from '$app/navigation';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

describe('FabActionSheet', () => {
  const date = '2025-01-15';
  const gotoMock = vi.mocked(navigation.goto);

  beforeEach(() => {
    gotoMock.mockReset();
  });

  it('renders three action buttons', () => {
    const { getByTestId } = render(FabActionSheet, {
      props: { date, onclose: vi.fn() },
    });
    expect(getByTestId('fab-action-meal')).toBeInTheDocument();
    expect(getByTestId('fab-action-skin')).toBeInTheDocument();
    expect(getByTestId('fab-action-photo')).toBeInTheDocument();
  });

  it('tapping "Přidat jídlo" opens the meal-type submenu (does NOT navigate immediately)', async () => {
    const { getByTestId, queryByRole, getByRole } = render(FabActionSheet, {
      props: { date, onclose: vi.fn() },
    });
    expect(queryByRole('button', { name: 'Snídaně' })).not.toBeInTheDocument();
    await fireEvent.click(getByTestId('fab-action-meal'));
    await tick();
    expect(getByRole('button', { name: /Snídaně/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Oběd/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Svačina/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Večeře/ })).toBeInTheDocument();
    // Submenu replaces the action list — meal/skin/photo rows are gone.
    expect(gotoMock).not.toHaveBeenCalled();
  });

  it('tapping a meal-type submenu row navigates to /meal with ?type=, ?date=, ?returnTo=', async () => {
    const onclose = vi.fn();
    const { getByTestId } = render(FabActionSheet, {
      props: { date, onclose },
    });
    await fireEvent.click(getByTestId('fab-action-meal'));
    await tick();
    await fireEvent.click(getByTestId('fab-meal-type-breakfast'));
    await tick();
    expect(gotoMock).toHaveBeenCalledWith(
      `/meal?type=breakfast&date=${date}&returnTo=/day/${date}`,
    );
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('a logged meal type renders with ✓ marker (data-logged="true") and accessible "již zaznamenáno" suffix', async () => {
    const { getByTestId } = render(FabActionSheet, {
      props: { date, onclose: vi.fn(), loggedTypes: ['breakfast', 'lunch'] },
    });
    await fireEvent.click(getByTestId('fab-action-meal'));
    await tick();
    expect(getByTestId('fab-meal-type-breakfast')).toHaveAttribute('data-logged', 'true');
    expect(getByTestId('fab-meal-type-lunch')).toHaveAttribute('data-logged', 'true');
    expect(getByTestId('fab-meal-type-snack')).toHaveAttribute('data-logged', 'false');
    expect(getByTestId('fab-meal-type-dinner')).toHaveAttribute('data-logged', 'false');
    expect(getByTestId('fab-meal-type-breakfast').getAttribute('aria-label')).toMatch(/Snídaně.*již zaznamenáno/);
  });

  it('the FAB is day-scoped — submenu row navigates with the current `date` prop', async () => {
    const pastDate = '2025-04-01';
    const { getByTestId } = render(FabActionSheet, {
      props: { date: pastDate, onclose: vi.fn() },
    });
    await fireEvent.click(getByTestId('fab-action-meal'));
    await tick();
    await fireEvent.click(getByTestId('fab-meal-type-dinner'));
    await tick();
    expect(gotoMock).toHaveBeenCalledWith(
      `/meal?type=dinner&date=${pastDate}&returnTo=/day/${pastDate}`,
    );
  });

  it('submenu has a back affordance that returns to the original action list', async () => {
    const { getByTestId, queryByTestId } = render(FabActionSheet, {
      props: { date, onclose: vi.fn() },
    });
    await fireEvent.click(getByTestId('fab-action-meal'));
    await tick();
    expect(queryByTestId('fab-action-skin')).not.toBeInTheDocument();
    await fireEvent.click(getByTestId('fab-meal-type-back'));
    await tick();
    expect(getByTestId('fab-action-skin')).toBeInTheDocument();
    expect(getByTestId('fab-action-meal')).toBeInTheDocument();
  });

  it('skin action navigates to /skin with correct date and returnTo', async () => {
    const { getByTestId } = render(FabActionSheet, {
      props: { date, onclose: vi.fn() },
    });
    await fireEvent.click(getByTestId('fab-action-skin'));
    await tick();
    expect(gotoMock).toHaveBeenCalledWith(
      `/skin?date=${date}&returnTo=/day/${date}`,
    );
  });

  it('photo button triggers file input; oncapturephoto called with selected file; onclose called', async () => {
    const onCapture = vi.fn();
    const onclose = vi.fn();
    const { container } = render(FabActionSheet, {
      props: { date, onclose, oncapturephoto: onCapture },
    });
    await tick();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await tick();

    expect(onCapture).toHaveBeenCalledOnce();
    expect(onCapture.mock.calls[0][0]).toBeInstanceOf(File);
    expect(onclose).toHaveBeenCalledOnce();
    expect(gotoMock).not.toHaveBeenCalled();
  });

  it('skin action calls onclose after navigating', async () => {
    const onclose = vi.fn();
    const { getByTestId } = render(FabActionSheet, { props: { date, onclose } });
    await fireEvent.click(getByTestId('fab-action-skin'));
    await tick();
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('close button calls onclose without navigating', async () => {
    const onclose = vi.fn();
    const { getByTestId } = render(FabActionSheet, { props: { date, onclose } });
    await fireEvent.click(getByTestId('fab-action-close'));
    await tick();
    expect(onclose).toHaveBeenCalledOnce();
    expect(gotoMock).not.toHaveBeenCalled();
  });
});
