/**
 * Offers newly-captured photo blobs to the OS share sheet so the user can
 * save them to Apple Photos (or any other target) with a single tap.
 *
 * Uses Web Share API level 2 (files). On iOS ≥ 15 this opens the native share
 * sheet; the user taps "Save Image" once to write all files to Photos.
 *
 * Silent no-op when:
 * - the browser does not support file sharing (Android WebView, desktop)
 * - the user cancels / dismisses the sheet (AbortError)
 * - sharing fails for any other reason
 *
 * Must be called within a user-gesture handler chain (button click).
 */
export async function sharePhotosToRoll(blobs: Blob[]): Promise<void> {
  if (!blobs.length) return;
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return;

  const files = blobs.map(
    (blob, i) =>
      new File([blob], `snimek-${i + 1}.jpg`, {
        type: blob.type || 'image/jpeg',
      }),
  );

  if (!navigator.canShare({ files })) return;

  try {
    await navigator.share({ files });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    // Any other error: silently swallow — sharing is best-effort
  }
}
