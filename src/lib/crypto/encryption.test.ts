import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './encryption';

describe('encryption', () => {
  const testData = new TextEncoder().encode('Hello, World!');
  const passphrase = 'test-passphrase-123';

  it('encrypts and decrypts data correctly', async () => {
    const encrypted = await encrypt(testData, passphrase);
    const decrypted = await decrypt(new Uint8Array(encrypted), passphrase);

    // Compare as arrays since Vitest's toEqual can be strict about typed array types
    expect(Array.from(new Uint8Array(decrypted))).toEqual(Array.from(testData));
  });

  it('produces different ciphertext for same input (random IV)', async () => {
    const encrypted1 = await encrypt(testData, passphrase);
    const encrypted2 = await encrypt(testData, passphrase);

    // Ciphertexts should differ due to random salt and IV
    expect(Array.from(new Uint8Array(encrypted1))).not.toEqual(Array.from(new Uint8Array(encrypted2)));
  });

  it('fails to decrypt with wrong passphrase', async () => {
    const encrypted = await encrypt(testData, passphrase);

    await expect(
      decrypt(new Uint8Array(encrypted), 'wrong-passphrase')
    ).rejects.toThrow('Decryption failed');
  });

  it('fails to decrypt corrupted data', async () => {
    const encrypted = await encrypt(testData, passphrase);
    const corrupted = new Uint8Array(encrypted);
    // Corrupt the ciphertext (after salt + iv)
    corrupted[30] ^= 0xff;

    await expect(decrypt(corrupted, passphrase)).rejects.toThrow('Decryption failed');
  });

  it('fails on data too short', async () => {
    const shortData = new Uint8Array(10);

    await expect(decrypt(shortData, passphrase)).rejects.toThrow('too short');
  });

  it('handles empty data', async () => {
    const emptyData = new Uint8Array(0);
    const encrypted = await encrypt(emptyData, passphrase);
    const decrypted = await decrypt(new Uint8Array(encrypted), passphrase);

    expect(Array.from(new Uint8Array(decrypted))).toEqual(Array.from(emptyData));
  });

  it('handles moderately large data', async () => {
    // 64KB of data (within crypto.getRandomValues limit)
    const largeData = crypto.getRandomValues(new Uint8Array(64 * 1024));
    const encrypted = await encrypt(largeData, passphrase);
    const decrypted = await decrypt(new Uint8Array(encrypted), passphrase);

    expect(Array.from(new Uint8Array(decrypted))).toEqual(Array.from(largeData));
  });

  it('handles unicode passphrase', async () => {
    const unicodePassphrase = '密码🔐héllo';
    const encrypted = await encrypt(testData, unicodePassphrase);
    const decrypted = await decrypt(new Uint8Array(encrypted), unicodePassphrase);

    expect(Array.from(new Uint8Array(decrypted))).toEqual(Array.from(testData));
  });
});
