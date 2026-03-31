/**
 * AES-256-GCM encryption with PBKDF2 key derivation.
 *
 * Used for E2E encryption of medical photos. The encryption happens in the browser
 * before upload, so the server only stores opaque encrypted blobs.
 *
 * Security properties:
 * - AES-256-GCM provides both confidentiality and authenticity (AEAD)
 * - PBKDF2 with 600K iterations protects against brute-force passphrase attacks
 * - Random IV per encryption prevents identical plaintext from producing identical ciphertext
 * - Lost passphrase = unrecoverable data (by design)
 */

/** PBKDF2 iterations - 600K is OWASP recommendation for 2023+ */
const PBKDF2_ITERATIONS = 600_000;

/** Salt length in bytes (128 bits) */
const SALT_LENGTH = 16;

/** IV length in bytes (96 bits for GCM) */
const IV_LENGTH = 12;

/** AES key length in bits */
const KEY_LENGTH = 256;

/**
 * Derive an AES-256 key from a passphrase using PBKDF2.
 */
async function deriveKey(
  passphrase: string,
  salt: BufferSource
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM with PBKDF2 key derivation.
 *
 * Output format: [salt (16 bytes)] [iv (12 bytes)] [ciphertext + auth tag]
 *
 * @param data - Plaintext data to encrypt
 * @param passphrase - User passphrase for key derivation
 * @returns Encrypted blob containing salt, IV, and ciphertext
 */
export async function encrypt(data: Uint8Array, passphrase: string): Promise<ArrayBuffer> {
  // Generate random salt and IV - these are fresh ArrayBuffers, not sliced views
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key from passphrase
  const key = await deriveKey(passphrase, salt);

  // Encrypt with AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data as BufferSource
  );

  // Combine salt + iv + ciphertext into single buffer
  const totalLength = SALT_LENGTH + IV_LENGTH + ciphertext.byteLength;
  const resultBuffer = new ArrayBuffer(totalLength);
  const result = new Uint8Array(resultBuffer);
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  return resultBuffer;
}

/**
 * Decrypt data encrypted with encrypt().
 *
 * @param data - Encrypted blob (salt + iv + ciphertext)
 * @param passphrase - User passphrase for key derivation
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong passphrase or corrupted data)
 */
export async function decrypt(data: Uint8Array, passphrase: string): Promise<ArrayBuffer> {
  if (data.byteLength < SALT_LENGTH + IV_LENGTH + 16) {
    throw new Error('Invalid encrypted data: too short');
  }

  // Copy sliced views into new Uint8Arrays backed by fresh ArrayBuffers
  // This is necessary because slice() returns views with ArrayBufferLike
  // which Web Crypto doesn't accept as BufferSource in TS 5.9+
  const saltBuffer = new ArrayBuffer(SALT_LENGTH);
  const salt = new Uint8Array(saltBuffer);
  salt.set(data.subarray(0, SALT_LENGTH));

  const ivBuffer = new ArrayBuffer(IV_LENGTH);
  const iv = new Uint8Array(ivBuffer);
  iv.set(data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH));

  const ciphertextLength = data.byteLength - SALT_LENGTH - IV_LENGTH;
  const ciphertextBuffer = new ArrayBuffer(ciphertextLength);
  const ciphertext = new Uint8Array(ciphertextBuffer);
  ciphertext.set(data.subarray(SALT_LENGTH + IV_LENGTH));

  // Derive key from passphrase
  const key = await deriveKey(passphrase, salt);

  // Decrypt with AES-GCM (will throw if auth tag fails)
  try {
    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
  } catch {
    throw new Error('Decryption failed: invalid passphrase or corrupted data');
  }
}
