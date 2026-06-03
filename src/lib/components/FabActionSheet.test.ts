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

  it('meal action navigates to /meal with correct date and returnTo', async () => {
    const { getByTestId } = render(FabActionSheet, {
      props: { date, onclose: vi.fn() },
    });
    await fireEvent.click(getByTestId('fab-action-meal'));
    await tick();
    expect(gotoMock).toHaveBeenCalledWith(
      `/meal?date=${date}&returnTo=/day/${date}`,
    );
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

  it('each action calls onclose after navigating', async () => {
    const onclose = vi.fn();
    const { getByTestId } = render(FabActionSheet, { props: { date, onclose } });
    await fireEvent.click(getByTestId('fab-action-meal'));
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
