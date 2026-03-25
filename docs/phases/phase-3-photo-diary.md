# Phase 3: Photo Diary with E2E Encryption

## Summary

This phase introduces the core photo diary functionality with end-to-end encryption. Users set a passphrase on first use, which derives an AES-256-GCM encryption key via PBKDF2. The photo diary supports two types of photos: **skin photos** (eczema tracking with body area labels and severity ratings) and **stool photos** (diaper photos with color, consistency, mucus, and blood indicators). Both types are compressed client-side, encrypted before leaving the browser, and uploaded as opaque blobs. A gallery view displays encrypted thumbnails (decrypted on demand) with type-based filtering, and a side-by-side comparison view allows picking two dates to visually track progression. All data works offline via IndexedDB with background sync when connectivity returns.

## Prerequisites

- **Phase 0** -- project scaffold with encryption stub modules in place.
- **Phase 1** -- authentication system (cookie-based sessions + bcrypt) so that uploaded blobs are tied to an authenticated user. `docs/architecture/ui-design.md` with UX decisions.
- PostgreSQL 16 running with the existing schema migrations applied.
- Dexie.js store configured for offline-first data.
- Tailwind CSS 4 utility layer available.

### UI Decisions — Deferred to User Testing

These decisions are deferred to user testing (on a real phone with the app shell from Phase 1). The architecture is UI-agnostic — PhotoDiaryService and PhotoStorage port do not depend on the UI pattern.

1. **Photo capture flow**: Candidates:
   - **Multi-step wizard** (type → camera → metadata → save, each screen): focused, guided, less overwhelming.
   - **Single scrollable page**: faster for repeat use, all steps visible at once.
   - Decision recorded in `ui-design.md` after testing.

2. **Gallery layout**: Candidates:
   - **Simple grid**: clean, fast rendering, familiar pattern.
   - **Grouped cards with date headers**: more context, expandable sections.
   - Decision recorded in `ui-design.md` after testing.

3. **Photo detail view**: Candidates:
   - **Full-screen overlay (modal)**: immersive for medical photos, swipe to dismiss.
   - **Separate page**: simpler to implement, URL-addressable.
   - Decision recorded in `ui-design.md` after testing.

## Features

1. **Passphrase setup flow** -- on first use the app prompts the user to create a passphrase. The passphrase is never stored; only the random salt is persisted in IndexedDB.
2. **Key derivation** -- PBKDF2 with 600 000 iterations derives an AES-256-GCM key from the passphrase + salt on every session start.
3. **Photo type selector** -- before capture, user selects photo type: "Kuze" (Skin) or "Stolice" (Stool).
4. **Camera capture page** -- opens the rear camera, captures a JPEG frame, and prompts for type-specific metadata.
5. **Ghost overlay** -- when a previous photo of the same type (and same body area for skin) exists, it is decrypted and displayed as a semi-transparent overlay (~30% opacity) on top of the live camera feed, helping the user align the camera consistently for better comparison. Toggleable on/off. When no previous photo exists, a static SVG silhouette (body area outline for skin, diaper framing guide for stool) is shown as fallback. Lighting-check hint ("Zajistete dostatecne osvetleni").
6. **Body area selector (skin)** -- enumerated areas: `face`, `arms`, `legs`, `torso`, `hands`, `other`.
7. **Stool metadata form (stool)** -- color picker (yellow/green/brown/red/black/white), consistency selector (liquid/soft/formed/hard), mucus toggle (yes/no), blood toggle (yes/no).
6. **Image compression** -- captured image resized to max 1920 px on the longest edge, re-encoded as JPEG at 80 % quality.
7. **Client-side encryption** -- compressed JPEG encrypted with AES-256-GCM; a separate smaller thumbnail (320 px) is encrypted independently.
8. **Server upload** -- encrypted blobs (full + thumbnail) uploaded via `POST /api/photos` with metadata (body area, severity, timestamp, IV, child ID).
9. **Photo gallery page** -- grid of thumbnails sorted newest-first, grouped by date. Thumbnails decrypted in the browser on scroll. Filter tabs for "Vse" (All), "Kuze" (Skin), "Stolice" (Stool).
10. **Photo detail view** -- full-size image decrypted and displayed with type-specific metadata (body area + severity for skin; color + consistency + mucus + blood for stool).
11. **Side-by-side comparison view** -- user picks two photos of the same type; the app shows them side by side with metadata.
12. **Manual severity rating (skin)** -- integer scale 1-5 assigned per skin photo at capture time (editable later).
13. **Offline support** -- encrypted blobs stored in IndexedDB via Dexie.js; a background sync adapter uploads pending blobs when connectivity is restored.

## Acceptance Criteria

- [ ] First-time user is prompted to set a passphrase before any photo functionality is available.
- [ ] Passphrase must be at least 12 characters. The UI enforces this with a validation message in Czech.
- [ ] A passphrase strength indicator is shown during setup (weak/medium/strong based on length and character variety).
- [ ] Passphrase can be re-entered on subsequent sessions to derive the same key (deterministic given same salt).
- [ ] Entering a wrong passphrase results in a decryption failure surfaced as a user-friendly Czech error message.
- [ ] Photo type selector offers "Kuze" (Skin) and "Stolice" (Stool) options before capture.
- [ ] Camera capture opens the rear-facing camera and produces a JPEG frame.
- [ ] When a previous photo of the same type (and same body area for skin) exists, it is shown as a ghost overlay at ~30% opacity on the live camera feed.
- [ ] The ghost overlay can be toggled on/off with a visible button ("Prekryv: zap/vyp").
- [ ] When no previous photo exists (first photo of that type/area), a static SVG silhouette is shown as fallback (body area outline for skin, diaper framing guide for stool).
- [ ] Ghost overlay decryption happens asynchronously and does not block camera startup -- camera feed is usable immediately, ghost appears once ready.
- [ ] Captured images are resized so the longest edge does not exceed 1920 px.
- [ ] Output JPEG quality is 80 %.
- [ ] Encrypted blob uploaded to the server cannot be decrypted without the user's passphrase.
- [ ] Gallery page loads and displays thumbnail grid within 2 seconds on a 4G connection (after initial cache).
- [ ] Photo detail view decrypts and renders the full image within 1 second on a modern phone.
- [ ] Comparison view renders two photos side by side with their metadata.
- [ ] Skin photos: severity rating (1-5) is persisted per photo and displayed in gallery/detail views.
- [ ] Stool photos: color, consistency, mucus, and blood metadata are persisted and displayed in detail view.
- [ ] Stool metadata form shows color as colored buttons (yellow/green/brown/red/black/white with Czech labels), consistency as selectable options, mucus and blood as toggle switches.
- [ ] Gallery supports filtering by photo type: "Vse" (All), "Kuze" (Skin), "Stolice" (Stool).
- [ ] Comparison view only allows comparing photos of the same type (skin with skin, stool with stool).
- [ ] Offline: capturing a photo while offline stores the encrypted blob locally and uploads it once online.
- [ ] Offline: gallery still shows previously cached thumbnails.
- [ ] All UI text is in Czech.

## Implementation Details

### Files Created / Modified

| Path | Purpose |
|------|---------|
| `src/lib/crypto/encryption.ts` | Full Web Crypto API implementation: `generateSalt()`, `deriveKey()`, `encrypt()`, `decrypt()` |
| `src/lib/utils/image.ts` | `resizeImage(blob, maxPx)` and `compressJpeg(blob, quality)` helpers |
| `src/lib/domain/services/photo-diary.ts` | Domain service orchestrating capture, compression, encryption, upload, and gallery retrieval |
| `src/lib/stores/photos.svelte.ts` | Svelte 5 runes store for photo list state, selected photos for comparison |
| `src/lib/adapters/encrypted-storage.ts` | Adapter implementing the storage port -- writes/reads encrypted blobs to IndexedDB (Dexie) and server |
| `src/lib/components/photo/CameraCapture.svelte` | Camera access, frame capture, ghost/fallback overlay |
| `src/lib/components/photo/GhostOverlay.svelte` | Decrypts and displays previous photo at 30% opacity over camera feed, with toggle button. Falls back to static SVG silhouette. |
| `src/lib/components/photo/PhotoTypeSelector.svelte` | Toggle between "Kuze" (Skin) and "Stolice" (Stool) photo types |
| `src/lib/components/photo/BodyAreaSelector.svelte` | Radio/button group for the six body areas (skin photos) |
| `src/lib/components/photo/StoolMetadataForm.svelte` | Color picker, consistency selector, mucus/blood toggles (stool photos) |
| `src/lib/components/photo/GalleryGrid.svelte` | Thumbnail grid with lazy decryption on scroll |
| `src/lib/components/photo/CompareView.svelte` | Side-by-side two-photo layout |
| `src/lib/components/photo/SeveritySlider.svelte` | 1-5 discrete slider component |
| `src/lib/components/photo/PassphraseModal.svelte` | Modal for initial passphrase setup and session unlock |
| `src/routes/(app)/photos/+page.svelte` | Photo gallery page |
| `src/routes/(app)/photos/capture/+page.svelte` | Camera capture page |
| `src/routes/(app)/photos/compare/+page.svelte` | Side-by-side comparison page |
| `src/routes/api/photos/+server.ts` | `POST` (upload), `GET` (list/download) encrypted blobs |
| Database migration | `tracking_photos` table: `id`, `user_id`, `child_id`, `photo_type`, `body_area`, `severity_manual`, `stool_color`, `stool_consistency`, `has_mucus`, `has_blood`, `iv`, `created_at`; blob stored on filesystem |

### Step-by-Step Instructions

1. **Create the encryption module** (`src/lib/crypto/encryption.ts`):
   - `generateSalt()` -- returns a 16-byte `Uint8Array` from `crypto.getRandomValues`.
   - `deriveKey(passphrase: string, salt: Uint8Array)` -- imports the passphrase as a `CryptoKey`, runs `PBKDF2` with SHA-256 and 600 000 iterations, derives an AES-256-GCM `CryptoKey`.
   - `encrypt(data: ArrayBuffer, key: CryptoKey)` -- generates a 12-byte IV, calls `crypto.subtle.encrypt` with AES-256-GCM, returns `{ iv: Uint8Array, ciphertext: ArrayBuffer }`.
   - `decrypt(ciphertext: ArrayBuffer, iv: Uint8Array, key: CryptoKey)` -- calls `crypto.subtle.decrypt`, returns the plaintext `ArrayBuffer`. Throws a typed `DecryptionError` on failure.

2. **Create image utilities** (`src/lib/utils/image.ts`):
   - `resizeImage(blob: Blob, maxPx: number): Promise<Blob>` -- draws to an OffscreenCanvas (or regular Canvas), scales proportionally so the longest edge equals `maxPx`, returns a new Blob.
   - `compressJpeg(blob: Blob, quality: number): Promise<Blob>` -- re-encodes the canvas output as `image/jpeg` at the given quality (0-1).
   - `createThumbnail(blob: Blob): Promise<Blob>` -- calls `resizeImage` with 320 px and `compressJpeg` with 0.6 quality.

3. **Implement the passphrase setup flow** (`PassphraseModal.svelte`):
   - On first use (no salt in IndexedDB), show a modal asking the user to create a passphrase with confirmation.
   - Generate a salt, derive the key, store the salt in Dexie.
   - On subsequent sessions, show an unlock modal -- user enters passphrase, key is derived from stored salt.
   - If decryption of a test blob fails, show "Nespravne heslo" (Wrong passphrase).

4. **Build the camera capture page** (`src/routes/(app)/photos/capture/+page.svelte`):
   - First screen: `PhotoTypeSelector` -- user chooses "Kuze" (Skin) or "Stolice" (Stool).
   - Request `getUserMedia({ video: { facingMode: 'environment' } })`.
   - Render a live video preview with the guidance overlay on top:
     - Query Dexie for the most recent photo of the same type (and same body area for skin).
     - If found: decrypt the thumbnail, display it as an `<img>` positioned over the `<video>` at `opacity: 0.3`. Add a toggle button ("Prekryv: zap/vyp").
     - If not found (first photo): fall back to a static SVG silhouette (body area outline for skin, rectangular diaper framing guide for stool).
     - Decrypt asynchronously -- show the camera feed immediately, overlay appears once decryption completes.
   - Lighting hint: sample average brightness from the video frame; if below threshold, show "Nedostatecne osvetleni".
   - On capture: grab the current frame to a Canvas, run `resizeImage` + `compressJpeg`.
   - For skin photos: prompt for body area (via `BodyAreaSelector`) and severity (via `SeveritySlider`).
   - For stool photos: prompt for metadata (via `StoolMetadataForm`) -- color, consistency, mucus, blood.
   - Encrypt the full image and the thumbnail separately.
   - Call the photo-diary domain service to persist locally and upload.

5. **Build the gallery page** (`src/routes/(app)/photos/+page.svelte`):
   - Fetch photo metadata from the server (or local Dexie if offline).
   - Filter tabs at the top: "Vse" (All), "Kuze" (Skin), "Stolice" (Stool).
   - Render `GalleryGrid` -- thumbnails are encrypted blobs; decrypt each in a Web Worker or on the main thread with `requestIdleCallback` batching.
   - Group by date, newest first. Skin photos show a body area label; stool photos show a small indicator icon.
   - Tap a thumbnail to navigate to the detail view.

6. **Build the comparison page** (`src/routes/(app)/photos/compare/+page.svelte`):
   - Let the user pick two photos of the same type (date pickers or gallery selection, filtered by photo type).
   - Decrypt both full images client-side.
   - Render `CompareView` -- two images side by side with type-specific metadata (body area + severity for skin; color + consistency for stool) and date labels.

7. **Server API** (`src/routes/api/photos/+server.ts`):
   - `POST /api/photos` -- accepts `multipart/form-data` with fields: `blob` (encrypted full), `thumbnail` (encrypted thumbnail), `metadata` (JSON: body_area, severity, iv_full, iv_thumb, child_id, created_at). Stores blob on disk (or S3-compatible storage), metadata in PostgreSQL `photos` table. Returns the photo ID.
   - `GET /api/photos` -- returns metadata list for the authenticated user's children.
   - `GET /api/photos/:id/blob` -- streams the encrypted blob.
   - `GET /api/photos/:id/thumbnail` -- streams the encrypted thumbnail.

8. **Offline adapter** (`src/lib/adapters/encrypted-storage.ts`):
   - On capture, always write to Dexie first (encrypted blob + metadata).
   - Register a sync handler: when online, iterate pending uploads and POST to the server.
   - On gallery load, prefer Dexie cache; fetch from server only if cache miss.

### Key Code Patterns

**Encryption round-trip (Web Crypto API):**

```typescript
// src/lib/crypto/encryption.ts
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv, ciphertext };
}

export async function decrypt(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
}
```

**Image compression (Canvas API):**

```typescript
// src/lib/utils/image.ts
export async function resizeImage(blob: Blob, maxPx: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
}
```

**Ports and Adapters -- storage port:**

```typescript
// src/lib/domain/ports/photo-storage.ts
export interface PhotoStorage {
  save(photo: EncryptedPhoto): Promise<string>;       // returns photo ID
  getMetadata(childId: string): Promise<PhotoMeta[]>;
  getBlob(photoId: string): Promise<ArrayBuffer>;
  getThumbnail(photoId: string): Promise<ArrayBuffer>;
  getPendingUploads(): Promise<EncryptedPhoto[]>;
  markUploaded(photoId: string): Promise<void>;
}
```

## Post-Implementation State

After completing Phase 3 the application supports the full photo diary workflow:

- On first use, the user sets a passphrase. The derived encryption key exists only in memory for the duration of the session.
- The user navigates to the capture page and first selects a photo type: "Kuze" (Skin) or "Stolice" (Stool).
- For skin photos: the user selects a body area from six predefined regions and assigns a severity rating (1-5). A body area silhouette overlay helps with framing.
- For stool photos: the user records color (yellow/green/brown/red/black/white), consistency (liquid/soft/formed/hard), and toggles for mucus and blood presence. A diaper framing guide assists with capture.
- The captured image is resized to at most 1920 px, compressed to JPEG 80 %, and a 320 px thumbnail is generated. Both are encrypted with AES-256-GCM using a unique IV per blob.
- Encrypted blobs are uploaded to the server; metadata (type-specific fields, IVs, timestamps) is stored in PostgreSQL in the `tracking_photos` table.
- The gallery page shows a date-grouped grid of thumbnails with filter tabs (All / Skin / Stool), each decrypted on demand in the browser.
- The detail view decrypts and displays the full-size image with type-specific metadata.
- The comparison view renders two photos of the same type side by side for visual tracking.
- When offline, encrypted blobs and metadata are stored in IndexedDB via Dexie.js. A background sync adapter uploads pending blobs once connectivity is restored.
- All UI strings are in Czech.

## Test Suite

### Unit Tests

**Encryption module (`src/lib/crypto/encryption.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | `encrypt` then `decrypt` with the same key returns the original plaintext | Byte-for-byte equality with the input `ArrayBuffer` |
| 2 | `decrypt` with a key derived from a wrong passphrase throws `DecryptionError` | Error thrown; message indicates authentication failure |
| 3 | `deriveKey` with the same passphrase and salt returns a key that produces identical ciphertext when IV is fixed (determinism check) | Ciphertext matches across two calls |
| 4 | `deriveKey` with the same passphrase but different salts produces different keys | Encrypting the same plaintext with both keys yields different ciphertext |
| 5 | `generateSalt` returns a `Uint8Array` of length 16 | `salt.length === 16` |
| 6 | `encrypt` produces a 12-byte IV | `result.iv.length === 12` |
| 7 | Two consecutive `encrypt` calls produce different IVs | `iv1 !== iv2` byte-wise |
| 8 | `encrypt` with an empty `ArrayBuffer` succeeds and `decrypt` returns empty buffer | Round-trip succeeds; output `byteLength === 0` |
| 9 | `encrypt` with a large payload (5 MB) completes within 2 seconds | No timeout; round-trip succeeds |

**Image utilities (`src/lib/utils/image.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | `resizeImage` with a 3000x2000 image and `maxPx=1920` returns 1920x1280 | Dimensions match proportional downscale |
| 2 | `resizeImage` with a 1000x800 image and `maxPx=1920` returns the image unchanged (no upscale) | Dimensions remain 1000x800 |
| 3 | `resizeImage` with a portrait 2000x3000 image and `maxPx=1920` returns 1280x1920 | Longest edge (height) scaled to 1920 |
| 4 | `compressJpeg` output is smaller than the input PNG blob | `output.size < input.size` |
| 5 | `createThumbnail` output longest edge is 320 px | Verify dimensions after decoding |
| 6 | `resizeImage` with a 1x1 pixel image does not throw | Returns a valid blob |

**Severity slider (`SeveritySlider.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Default value is 1 | Component renders with value 1 selected |
| 2 | Clicking value 4 dispatches change event with `detail: 4` | Event payload is `4` |
| 3 | Values outside 1-5 are clamped | Setting value to 0 clamps to 1; setting to 6 clamps to 5 |

**Body area selector (`BodyAreaSelector.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Renders all six body areas | Six buttons/options visible |
| 2 | Selecting "face" dispatches change event with `detail: 'face'` | Event payload is `'face'` |
| 3 | Only one area can be selected at a time | Selecting "arms" deselects "face" |

**Photo type selector (`PhotoTypeSelector.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Renders two options: "Kuze" and "Stolice" | Two buttons visible with Czech labels |
| 2 | Selecting "Stolice" dispatches change event with `detail: 'stool'` | Event payload is `'stool'` |
| 3 | Default selection is none (user must choose) | No option pre-selected |

**Stool metadata form (`StoolMetadataForm.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Renders 6 color options with correct Czech labels | Buttons for zluta/zelena/hneda/cervena/cerna/bila visible |
| 2 | Renders 4 consistency options | Buttons for tekuta/mekka/formovana/tvrda visible |
| 3 | Mucus toggle defaults to false | Toggle is off |
| 4 | Blood toggle defaults to false | Toggle is off |
| 5 | Selecting color "green" dispatches correct metadata | `stoolColor === 'green'` |
| 6 | Toggling mucus on dispatches `hasMucus: true` | Metadata updated |
| 7 | Form requires at least color and consistency before save | Save button disabled until both selected |

### Integration Tests

**Photo upload/download API (`src/routes/api/photos/server.integration.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | `POST /api/photos` with valid multipart data returns 201 and a photo ID | Response status 201; body contains `id` |
| 2 | `POST /api/photos` without authentication returns 401 | Response status 401 |
| 3 | `POST /api/photos` with missing blob field returns 400 | Response status 400; error message indicates missing blob |
| 4 | `GET /api/photos` returns metadata for the authenticated user's children only | Response contains only photos belonging to the test user's children |
| 5 | `GET /api/photos/:id/blob` returns the exact encrypted blob that was uploaded | Byte-for-byte match |
| 6 | `GET /api/photos/:id/thumbnail` returns the exact encrypted thumbnail that was uploaded | Byte-for-byte match |
| 7 | `GET /api/photos/:id/blob` for another user's photo returns 403 | Response status 403 |

**Encrypted storage adapter (`encrypted-storage.integration.test.ts`):**

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | `save` writes to IndexedDB and the record is retrievable | `getBlob` returns the stored data |
| 2 | `getPendingUploads` returns only photos not yet uploaded to server | List length matches expected count |
| 3 | `markUploaded` removes the photo from pending uploads | Subsequent `getPendingUploads` excludes it |
| 4 | Concurrent saves do not corrupt the Dexie store | All saved records retrievable |

### E2E / Manual Tests

| # | Scenario | Steps | Expected result |
|---|----------|-------|-----------------|
| 1 | Passphrase setup (first use) | Open app for the first time after Phase 1 login. Observe passphrase modal. Enter "testpassphrase" and confirm. | Modal closes. Salt stored in IndexedDB. No errors. |
| 2 | Passphrase unlock (returning session) | Close and reopen the app. Enter passphrase modal appears. Enter "testpassphrase". | Unlock succeeds; gallery page is accessible. |
| 3 | Wrong passphrase | Close and reopen the app. Enter "wrongpassphrase". | Error message "Nespravne heslo" displayed. Gallery not accessible. |
| 4 | Capture photo | Navigate to `/photos/capture`. Grant camera permission. Select body area "face". Adjust severity to 3. Tap capture. | Photo captured, compressed, encrypted, and uploaded. Redirect to gallery. New thumbnail visible. |
| 5 | Ghost overlay (previous exists) | After capturing at least one "face" skin photo, open capture again and select "face". | Previous photo appears as semi-transparent overlay on camera feed. Toggle button visible. |
| 5b | Ghost overlay toggle | With ghost overlay visible, tap "Prekryv: vyp". | Overlay disappears. Tap "Prekryv: zap" -- overlay reappears. |
| 5c | Static fallback (no previous) | Select body area "legs" for the first time (no previous photo). | Static SVG silhouette for legs displayed instead of ghost overlay. |
| 6 | Gallery view | Navigate to `/photos`. | Thumbnails grouped by date, newest first. Each thumbnail decrypts and renders. |
| 7 | Photo detail | Tap a thumbnail in the gallery. | Full-size photo decrypted and displayed with body area, severity, and date. |
| 8 | Side-by-side comparison | Navigate to `/photos/compare`. Select two photos from different dates. | Both photos rendered side by side with metadata labels. |
| 9 | Offline capture | Disable network. Capture a photo. | Photo saved locally. No upload error shown. |
| 10 | Offline sync | Re-enable network after offline capture. | Pending photo uploads automatically. Gallery reflects the synced photo. |
| 11 | Large photo | Capture a photo from a 48 MP camera sensor. | Image resized to max 1920 px. Encryption and upload succeed without timeout. |
| 12 | Stool photo capture | Navigate to `/photos/capture`. Select "Stolice". Grant camera permission. Capture photo. Select color "green", consistency "soft", toggle mucus on, blood off. Save. | Photo captured with stool metadata. Redirect to gallery. Thumbnail visible with stool indicator. |
| 13 | Stool photo detail | Tap a stool photo thumbnail in gallery. | Full-size image displayed with color (zelena), consistency (mekka), mucus (ano), blood (ne) labels in Czech. |
| 14 | Gallery filter | Gallery has both skin and stool photos. Tap "Kuze" filter. | Only skin photos visible. Tap "Stolice" -- only stool photos. Tap "Vse" -- all photos. |
| 15 | Comparison type restriction | Navigate to compare view. Try to select a skin photo and a stool photo. | UI prevents mixing types -- only photos of the same type are selectable. |

### Regression Checks

- [ ] Phase 1 authentication still works: login, logout, session persistence.
- [ ] Existing Dexie.js stores from Phase 0/1 are not corrupted by the new `photos` table.
- [ ] Navigation between existing pages and new photo pages works without layout shifts.
- [ ] Cookie-based session is sent correctly on all `/api/photos` requests.
- [ ] Tailwind CSS styles do not conflict between existing components and new photo components.
- [ ] Offline indicator (if introduced in earlier phases) still functions.
