# End-to-End Encryption

This document describes the encryption scheme used in the Eczema Tracker PWA to protect medical photos of a child. It covers the rationale, encryption and decryption flows, key management, PBKDF2 parameters, and the security threat model.

---

## Why End-to-End Encryption

The app stores medical photos of an infant's skin condition. These are sensitive medical images that deserve strong privacy protection:

1. **Server compromise resistance.** If the VPS is breached, the attacker gets only encrypted blobs that are useless without the passphrase.
2. **Self-hosting risk mitigation.** Even though the server admin is the parent themselves, E2E encryption is a principled defense-in-depth measure. A misconfigured server, an unpatched vulnerability, or a future handoff of the server does not expose the photos.
3. **Data at rest protection.** The encrypted blobs on disk are meaningless without the encryption key.
4. **Regulatory alignment.** While this is a personal app, treating medical images with E2E encryption aligns with GDPR and healthcare data protection principles.

**What is NOT encrypted:**
- Structured data (food logs, analysis results, user profiles) is stored in plaintext in PostgreSQL. This data does not contain images and is less sensitive.
- Analysis result text (trend assessments, severity scores) is stored in plaintext because it is needed for server-side queries (trend aggregation, reminders).

---

## Encryption Flow Diagrams

### Photo Capture and Upload

```
1. CAPTURE
   iPhone camera (via browser MediaDevices API)
     → raw image (JPEG from camera)

2. RESIZE & COMPRESS
   Browser <canvas> element
     → resize to max 1920px on longest side
     → re-encode as JPEG, quality 80%
     → also generate thumbnail: 320px wide, JPEG quality 60%
     → result: two ArrayBuffers (full image + thumbnail)

3. KEY DERIVATION (if not already cached in memory)
   User passphrase (entered once per session)
     → PBKDF2 with stored salt
     → AES-256-GCM CryptoKey
     → key cached in memory for the session

4. ENCRYPT (full image)
   Generate random 12-byte IV
     → AES-256-GCM encrypt(plaintext ArrayBuffer, key, IV)
     → result: encrypted ArrayBuffer
     → prepend IV to ciphertext (IV || ciphertext)

5. ENCRYPT (thumbnail)
   Generate separate random 12-byte IV
     → AES-256-GCM encrypt(thumbnail ArrayBuffer, key, IV)
     → prepend IV to ciphertext

6. UPLOAD
   POST /api/photos
     → multipart/form-data: encrypted full blob + encrypted thumbnail + metadata
     → HTTPS in transit (TLS 1.3)
     → server stores blobs as-is in /data/photos/{childId}/{date}/{photoId}.enc
     → server stores metadata (date, body area, blob path) in PostgreSQL
     → server CANNOT decrypt the blobs

7. LOCAL CACHE
   Dexie.js (IndexedDB)
     → store encrypted thumbnail locally for offline gallery viewing
     → optionally store encrypted full image for offline access
```

### Photo Viewing

```
1. REQUEST
   Browser requests encrypted blob
     → GET /api/photos/{blobRef}
     → server returns encrypted ArrayBuffer

2. SPLIT IV AND CIPHERTEXT
   First 12 bytes = IV
   Remaining bytes = ciphertext

3. DECRYPT
   AES-256-GCM decrypt(ciphertext, key, IV)
     → result: plaintext JPEG ArrayBuffer

4. DISPLAY
   Create object URL from ArrayBuffer
     → URL.createObjectURL(new Blob([plaintext], { type: 'image/jpeg' }))
     → set as <img src="...">
     → revoke object URL when component unmounts (memory management)
```

### AI Analysis

```
1. DECRYPT LOCALLY
   Both photos decrypted in the browser (same flow as Photo Viewing)

2. ENCODE FOR API
   Convert decrypted ArrayBuffers to base64 strings

3. CALL AI
   Browser sends decrypted images directly to Claude Vision API
     → HTTPS POST to api.anthropic.com
     → request includes both images + structured prompt
     → response: JSON with trend, scores, explanation

4. STORE RESULT
   Analysis result (text only, no images) sent to server
     → POST /api/analysis-results
     → stored in PostgreSQL as plaintext (not sensitive)

NOTE: The server never handles decrypted photos during analysis.
      The browser decrypts locally and calls Claude directly.
```

### Key Management

```
FIRST-TIME SETUP:
  User creates account
    → app prompts for encryption passphrase (separate from login password)
    → generate cryptographically random 16-byte salt
    → derive AES-256-GCM key via PBKDF2
    → store salt in server database (associated with user)
    → store salt in IndexedDB (for offline key derivation)
    → key itself is NEVER stored persistently
    → key is held in memory only during active session

SESSION START:
  User logs in
    → app prompts for encryption passphrase
    → retrieve salt from server (or IndexedDB if offline)
    → derive key via PBKDF2
    → cache derived CryptoKey in JavaScript memory
    → key is available for encrypt/decrypt operations

SESSION END:
  User logs out OR closes the browser
    → CryptoKey reference is garbage collected
    → passphrase is not stored anywhere
    → next session requires re-entering the passphrase

MULTI-DEVICE:
  Both parents need to know the same passphrase
    → same passphrase + same salt → same key → can decrypt same photos
    → passphrase is a shared secret communicated out-of-band

PASSPHRASE LOST:
  If both parents forget the passphrase
    → all encrypted photos are permanently unrecoverable
    → this is by design (no backdoor, no recovery mechanism)
    → structured data (food logs, analysis results) remains accessible
    → users can set a new passphrase and continue with new photos
```

---

## PBKDF2 Key Derivation Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Algorithm | PBKDF2 | Standard, available in Web Crypto API |
| Hash function | SHA-256 | Secure, fast enough for PBKDF2 iterations |
| Iterations | 600,000 | OWASP 2023 recommendation for PBKDF2-SHA256 |
| Salt length | 16 bytes (128 bits) | Prevents rainbow table attacks, unique per user |
| Salt source | `crypto.getRandomValues()` | Cryptographically secure random |
| Derived key length | 256 bits (32 bytes) | Required for AES-256 |
| Derived key type | AES-GCM | Used for both encrypt and decrypt operations |
| Key usages | `['encrypt', 'decrypt']` | Minimum required permissions |

### Implementation Sketch

```typescript
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import passphrase as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,        // not extractable
    ['encrypt', 'decrypt']
  );
}
```

---

## AES-256-GCM Encrypt/Decrypt

### Encryption Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Algorithm | AES-GCM | Authenticated encryption (confidentiality + integrity) |
| Key size | 256 bits | Maximum security level for AES |
| IV (nonce) | 12 bytes (96 bits) | Recommended size for AES-GCM; generated fresh for each encryption |
| IV source | `crypto.getRandomValues()` | Cryptographically secure random |
| Tag length | 128 bits (default) | Authentication tag for integrity verification |
| Additional data (AAD) | `childId + ":" + photoId` | Binds ciphertext to its metadata, preventing blob-swapping attacks |

### Encrypt

```typescript
async function encrypt(
  plaintext: ArrayBuffer,
  key: CryptoKey,
  aad?: string            // e.g., "childId:photoId" — binds ciphertext to metadata
): Promise<ArrayBuffer> {
  // Generate random IV for this encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt with optional Additional Authenticated Data
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      ...(aad && { additionalData: new TextEncoder().encode(aad) }),
    },
    key,
    plaintext
  );

  // Prepend IV to ciphertext for storage
  // Format: [12 bytes IV][N bytes ciphertext + auth tag]
  const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.byteLength);

  return result.buffer;
}
```

### Decrypt

```typescript
async function decrypt(
  data: ArrayBuffer,
  key: CryptoKey,
  aad?: string            // must match the AAD used during encryption
): Promise<ArrayBuffer> {
  const dataArray = new Uint8Array(data);

  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = dataArray.slice(0, 12);
  const ciphertext = dataArray.slice(12);

  // Decrypt and verify authentication tag + AAD
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      ...(aad && { additionalData: new TextEncoder().encode(aad) }),
    },
    key,
    ciphertext
  );
}
```

### Error Handling

- If the wrong passphrase is used, `crypto.subtle.decrypt()` throws a `DOMException` with `OperationError` because the authentication tag will not match.
- The UI should catch this error and prompt the user to re-enter their passphrase.
- There is no way to distinguish "wrong passphrase" from "corrupted data" -- both produce an authentication failure. This is by design (does not leak information about the key).

---

## Security Threat Model

### What is Protected

| Threat | Protection | Level |
|---|---|---|
| Server compromise (attacker gets filesystem + database access) | Photos are encrypted with AES-256-GCM; attacker gets only encrypted blobs and the salt (useless without passphrase) | Strong |
| Database leak (SQL injection, backup theft) | Photo blobs are not in the database; metadata does not contain images; salt alone is not useful | Strong |
| Network interception (MITM) | HTTPS/TLS encrypts all traffic in transit; E2E encryption means even if TLS is broken, photos remain encrypted | Strong (double layer) |
| Physical access to server disk | Encrypted blobs are unreadable without the passphrase-derived key | Strong |
| Server admin (self) viewing photos | E2E encryption prevents server-side decryption; the admin would need the passphrase | Strong |

### What is NOT Protected

| Threat | Exposure | Mitigation |
|---|---|---|
| Device compromise (attacker has unlocked phone) | Passphrase may be cached in memory during an active session; photos are decrypted in the browser for viewing | Phone lock screen, biometric auth. Clear session on app close. |
| Shoulder surfing | Photos are displayed in plaintext on screen when viewing | User responsibility; app could add a "hide photos" toggle |
| Passphrase brute force (offline) | If attacker has the encrypted blob and salt, they can attempt offline brute force | 600,000 PBKDF2 iterations make brute force expensive (~$10K+ for a strong passphrase) |
| Weak passphrase | Short or common passphrases reduce brute-force resistance | UI enforces minimum length (12+ characters) and provides strength indicator |
| Claude API key exposure | API key is used client-side to call Claude | Key stored in environment; consider server-side proxy in the future |
| Metadata analysis | An attacker with database access can see when photos were taken, which body areas, severity scores, food log entries | Accept this risk; metadata is less sensitive than the images themselves |
| Browser memory dump | Decrypted photos exist briefly in browser memory | Revoke object URLs promptly; minimize time photos are held in memory |

### Trust Boundaries

```
TRUSTED (runs on user's device):
  - Browser (Svelte app, Web Crypto, IndexedDB)
  - Passphrase entry
  - Decrypted photos (in memory only)
  - Claude API calls (from browser)

UNTRUSTED (server, could be compromised):
  - VPS filesystem (stores encrypted blobs)
  - PostgreSQL database (stores metadata + salt)
  - Nginx (proxies requests)
  - Docker containers

EXTERNAL (third-party):
  - Claude API (Anthropic) -- receives decrypted photos for analysis
  - Let's Encrypt (certificate authority)
  - Web Push service (browser vendor's push server)
```

The Anthropic Claude API is a notable trust boundary: decrypted photos are sent to it for analysis. Users should be aware that Anthropic's data retention policy applies. In the future, a local analysis model could eliminate this external dependency.

---

## Future Improvements

1. **Per-photo keys.** Instead of one key for all photos, derive a unique sub-key per photo (using the photo ID as additional input to HKDF). This limits the blast radius if a single key is somehow compromised.
2. **Key rotation.** Allow users to change their passphrase. This requires re-encrypting all existing photos with the new key (resource-intensive but doable as a background task).
3. **Hardware-backed key storage.** On devices that support it, store the derived key in the platform keychain (via Web Authentication or platform-specific APIs) instead of only in JavaScript memory.

*Note: AAD (Associated Data) and server-side AI proxy are now implemented — see the encrypt/decrypt functions above and `docs/architecture/tech-stack.md`.*
