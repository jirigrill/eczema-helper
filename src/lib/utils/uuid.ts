export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for iOS Safari < 15.4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0]! & 0xf) | (c === 'y' ? 0x8 : 0);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
