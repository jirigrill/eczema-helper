import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './encryption';

describe('encryption stubs', () => {
  it('encrypt throws Not implemented', async () => {
    await expect(encrypt(new Uint8Array([1, 2, 3]), 'key')).rejects.toThrow('Not implemented');
  });

  it('decrypt throws Not implemented', async () => {
    await expect(decrypt(new Uint8Array([1, 2, 3]), 'key')).rejects.toThrow('Not implemented');
  });
});
