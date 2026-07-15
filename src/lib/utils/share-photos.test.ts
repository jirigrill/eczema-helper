import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sharePhotosToRoll } from './share-photos';

function makeBlob(type = 'image/jpeg'): Blob {
  return new Blob(['x'], { type });
}

describe('sharePhotosToRoll', () => {
  const shareSpy = vi.fn().mockResolvedValue(undefined);
  const canShareSpy = vi.fn().mockReturnValue(true);

  beforeEach(() => {
    shareSpy.mockClear().mockResolvedValue(undefined);
    canShareSpy.mockClear().mockReturnValue(true);
    vi.stubGlobal('navigator', { share: shareSpy, canShare: canShareSpy });
  });

  it('no-op when blob array is empty', async () => {
    await sharePhotosToRoll([]);
    expect(shareSpy).not.toHaveBeenCalled();
  });

  it('no-op when navigator.share is absent', async () => {
    vi.stubGlobal('navigator', { share: undefined, canShare: canShareSpy });
    await sharePhotosToRoll([makeBlob()]);
    expect(shareSpy).not.toHaveBeenCalled();
  });

  it('no-op when navigator.canShare is absent', async () => {
    vi.stubGlobal('navigator', { share: shareSpy, canShare: undefined });
    await sharePhotosToRoll([makeBlob()]);
    expect(shareSpy).not.toHaveBeenCalled();
  });

  it('no-op when canShare({ files }) returns false', async () => {
    canShareSpy.mockReturnValue(false);
    await sharePhotosToRoll([makeBlob()]);
    expect(shareSpy).not.toHaveBeenCalled();
  });

  it('calls share with File array for each blob', async () => {
    const blobs = [makeBlob('image/jpeg'), makeBlob('image/png')];
    await sharePhotosToRoll(blobs);

    expect(shareSpy).toHaveBeenCalledOnce();
    const { files } = shareSpy.mock.calls[0]![0] as { files: File[] };
    expect(files).toHaveLength(2);
    expect(files[0]!.name).toBe('snimek-1.jpg');
    expect(files[0]!.type).toBe('image/jpeg');
    expect(files[1]!.name).toBe('snimek-2.jpg');
    expect(files[1]!.type).toBe('image/png');
  });

  it('falls back to image/jpeg when blob has no type', async () => {
    await sharePhotosToRoll([new Blob(['x'])]);

    const { files } = shareSpy.mock.calls[0]![0] as { files: File[] };
    expect(files[0]!.type).toBe('image/jpeg');
  });

  it('does not throw when share throws AbortError (user cancel)', async () => {
    shareSpy.mockRejectedValue(new DOMException('User cancelled', 'AbortError'));
    await expect(sharePhotosToRoll([makeBlob()])).resolves.toBeUndefined();
  });

  it('does not throw when share throws any other error', async () => {
    shareSpy.mockRejectedValue(new Error('Permission denied'));
    await expect(sharePhotosToRoll([makeBlob()])).resolves.toBeUndefined();
  });
});
