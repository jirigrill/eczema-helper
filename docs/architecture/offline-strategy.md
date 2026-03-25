# Offline Strategy

How the Eczema Tracker PWA handles offline-first data access, synchronization between Dexie.js (IndexedDB) and PostgreSQL, and service worker caching.

---

## 1. Offline-First Principle

All mutations go to Dexie.js first. The UI updates immediately (optimistic). Server synchronization happens in the background when the device is online.

The app is fully usable without a network connection for core features:

- Food logging (create, edit, delete)
- Meal tracking
- Photo capture and encryption
- Gallery viewing (thumbnails and cached full-size images)
- PDF export (client-side generation)

Features that require a network connection:

- AI photo analysis (server proxy to Claude Vision API)
- Push notifications (server-side delivery)
- Google Doc export (Drive and Docs API)
- Login and registration (server auth)

---

## 2. Data Cached Locally in Dexie.js

| Dexie Table | Source | Cache Strategy |
|---|---|---|
| `children` | Server | Full sync on login, updated on mutation |
| `foodCategories` | Server | Full sync on login (read-only seed data) |
| `foodSubItems` | Server | Full sync on login (read-only seed data) |
| `foodLogs` | Server + local | Bidirectional sync, local-first |
| `meals` | Server + local | Bidirectional sync, local-first |
| `mealItems` | Server + local | Bidirectional sync, local-first |
| `trackingPhotos` | Server + local | Metadata bidirectional; encrypted blobs cached for offline gallery |
| `analysisResults` | Server | Downloaded from server, read-only locally |
| `photoBlobs` | Local | Encrypted photo blobs (full + thumbnail) stored as ArrayBuffer. Keyed by `photoId`. Type field distinguishes `'full'` vs `'thumbnail'`. Full-size blobs evicted under storage pressure; thumbnails always kept. |

---

## 3. Sync Direction and Triggers

**Push (Dexie to Server):**
Triggered by the `navigator.onLine` event, a periodic poll every 60 seconds when online, and manual pull-to-refresh. Records with `syncedAt = null` are pending upload.

**Pull (Server to Dexie):**
On login (full initial sync), on app focus (delta sync using `updatedAt > lastSyncTimestamp`), and after a push completes (to pick up changes from the other parent's device).

**Sync order:**
Push local changes first, then pull server changes. This ensures local edits are not overwritten by stale server state.

---

## 4. Initial Data Load

On first login, the app performs a full data load in the following order:

1. Fetch all `foodCategories` and `foodSubItems` (seed data, approximately 13 categories and 50 items).
2. Fetch all `children` linked to the user.
3. Fetch `foodLogs` for the last 90 days.
4. Fetch `meals` and `mealItems` for the last 90 days.
5. Fetch `trackingPhotos` metadata for the last 90 days (not the encrypted blobs).
6. Fetch `analysisResults` for the last 90 days.
7. Store a `lastSyncTimestamp` in Dexie.

Subsequent syncs only fetch records where `updated_at > lastSyncTimestamp`.

---

## 5. Conflict Resolution

Strategy: **last-write-wins by server-side `updatedAt` timestamp**.

When pulling server data that conflicts with a local record:

1. Compare `updatedAt` timestamps.
2. The record with the more recent `updatedAt` wins.
3. The losing version is overwritten silently.

This is acceptable because:

- Only 2 users (both parents), rarely editing the same record simultaneously.
- Food logs and photos are append-mostly (create new records, rarely edit existing ones).
- Conflicts are unlikely in practice.

Edge case: if both parents edit the same food log within the same second, the server version wins (server `updatedAt` is set on insert).

No conflict log is maintained. This would be over-engineering for a 2-user app. If needed in the future, a `conflicts` Dexie table could be added.

**Server-side timestamps:** When a record is pushed from Dexie to the server, the server sets `updated_at = NOW()` (ignoring the client's `updatedAt`). This eliminates clock-skew issues between devices. The push order determines the winner — if both parents edit the same record offline, the one who syncs first gets their version as the baseline, and the second sync overwrites it with the later server timestamp.

**Duplicate logical records:** To prevent both parents from logging the same food elimination independently, add a unique constraint on `(child_id, date, category_id, action)` in the `food_logs` table, with `ON CONFLICT DO NOTHING` in the batch sync upsert.

---

## 6. Encrypted Photo Blob Caching

- **On photo capture:** The encrypted blob is stored in Dexie immediately, enabling offline gallery access.
- **When online:** The encrypted blob is uploaded to the server via `POST /api/photos`.
- **On successful upload:** `syncedAt` is set on the local record. The local blob can optionally be kept or evicted based on storage pressure.
- **Gallery viewing:** Prefer the local Dexie blob (no network needed). Fall back to a server download if the blob is not cached locally.
- **Thumbnails** (320px, encrypted) are always kept locally for fast gallery rendering.
- **Full-size blobs** may be evicted from Dexie after sync if device storage is low. They are re-downloadable from the server.

---

## 7. Background Sync Implementation

```typescript
// src/lib/adapters/sync.ts
export class SyncEngine {
  private syncInProgress = false;

  async pushPendingChanges(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    try {
      // Push unsynced food logs
      const unsyncedLogs = await db.foodLogs.where('syncedAt').equals(null).toArray();
      // ... batch POST to /api/food-logs/batch
      // On success, set syncedAt = new Date().toISOString()

      // Push unsynced photos (metadata + encrypted blobs)
      const unsyncedPhotos = await db.trackingPhotos.where('syncedAt').equals(null).toArray();
      // ... POST each to /api/photos (multipart with encrypted blob)
    } finally {
      this.syncInProgress = false;
    }
  }

  async pullServerChanges(): Promise<void> {
    const lastSync = await getLastSyncTimestamp();
    // GET /api/sync?since={lastSync}
    // Upsert received records into Dexie (last-write-wins)
    // Update lastSyncTimestamp
  }

  async fullSync(): Promise<void> {
    await this.pushPendingChanges();
    await this.pullServerChanges();
  }
}
```

---

## 8. Sync Triggers

```
App startup (online)          -> fullSync()
navigator 'online' event      -> pushPendingChanges() then pullServerChanges()
Every 60s (if online)          -> pullServerChanges()
After local mutation           -> pushPendingChanges() (debounced 5s)
Pull-to-refresh gesture        -> fullSync()
App focus (visibilitychange)   -> pullServerChanges()
```

---

## 9. Behavior on Logout

On logout, the app performs the following steps:

1. Push any remaining unsynced changes (best-effort; skip if offline).
2. Clear all Dexie tables.
3. Clear `lastSyncTimestamp`.
4. Clear the encryption key from memory.
5. Redirect to the login page.

This ensures no data leaks between users on a shared device.

---

## 10. Dexie Schema Evolution

When adding new tables or indexes across phases, bump the Dexie version number and provide an upgrade hook if data transformation is needed:

```typescript
// Adding a new table in Phase 3
this.version(2).stores({
  // ... all existing tables unchanged ...
  photoBlobs: 'id, photoId, type'  // new table
});

// Adding a new index in a later phase
this.version(3).stores({
  // ... existing stores with the new index added ...
  trackingPhotos: 'id, childId, date, photoType, [childId+date], [childId+photoType], syncedAt'
}).upgrade(tx => {
  // Optional data migration if needed
});
```

**Rules:**
- Never modify a published version's store definition. Always create a new version.
- Dexie handles adding new tables and indexes automatically.
- Use `.upgrade(tx => ...)` only when existing data needs transformation.
- After a schema upgrade, the sync engine should perform a full re-sync to ensure consistency.
- Test schema migrations by creating a database at version N-1, populating with test data, opening at version N, and verifying data is preserved.

---

## 11. IndexedDB Storage Quota Management

Browser storage quotas vary: Safari limits IndexedDB to ~1 GB per origin, Chrome is more generous but can evict data under storage pressure.

**Detection:**
```typescript
const estimate = await navigator.storage.estimate();
const usagePct = (estimate.usage! / estimate.quota!) * 100;
```

**Eviction strategy (when usage > 80%):**
1. Evict full-size blobs from `photoBlobs` (LRU order), keeping only thumbnails.
2. Show a Czech-language warning: "Úložiště zařízení je téměř plné. Plné fotky budou staženy ze serveru při zobrazení."
3. Never evict thumbnails — they are essential for offline gallery.

**Persistent storage:** Request via `navigator.storage.persist()` after PWA installation to reduce the risk of browser-initiated eviction.

**Sync status indicator:** Display a sync status icon in the app header:
- Green cloud: all data synced
- Orange cloud: syncing in progress
- Grey cloud with slash: offline
- Show a brief toast on sync completion: "Všechna data synchronizována."
- On items created offline, show an inline label: "Uloženo lokálně, bude synchronizováno."

---

## 12. Service Worker Caching Strategy

Using Workbox via `@vite-pwa/sveltekit`:

| Resource | Strategy | Max Age |
|---|---|---|
| App shell (HTML, JS, CSS) | StaleWhileRevalidate | Indefinite (versioned by build hash) |
| Static assets (icons, fonts) | CacheFirst | 30 days |
| API responses (`/api/*`) | NetworkFirst | No cache (data freshness matters) |
| Encrypted photo blobs | CacheFirst via Dexie | Managed by SyncEngine, not Workbox |

---

## 13. What Works Offline vs Online-Only

| Feature | Offline | Online required |
|---|---|---|
| View calendar and food logs | Yes (from Dexie) | -- |
| Add/edit food logs | Yes (syncs later) | -- |
| Add/edit meals | Yes (syncs later) | -- |
| Capture and encrypt photos | Yes (stored in Dexie) | -- |
| View photo gallery (thumbnails) | Yes (cached in Dexie) | -- |
| View full-size photos | Depends (cached = yes) | If not cached locally |
| AI photo analysis | -- | Yes (Claude Vision API) |
| Push notifications | -- | Yes (server-side cron) |
| PDF export | Yes (client-side pdfmake) | -- |
| Google Doc export | -- | Yes (Drive and Docs API) |
| Login / Register | -- | Yes (server auth) |
