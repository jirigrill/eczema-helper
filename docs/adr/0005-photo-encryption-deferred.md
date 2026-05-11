# 0005 — Photo encryption at rest deferred past v1

**Status:** Accepted (with shipping constraint)
**Date:** 2026-05-11

## Context

Eczema photos of a breastfed newborn are the most sensitive data the
app holds. `CLAUDE.md` declares the intent for AES-256-GCM /
PBKDF2-derived keys when photo features are wired.

Three v1 postures were considered:

- **(a)** Plaintext in IndexedDB. Encrypted only inside the export
  blob from [ADR-0002](0002-backup-floor.md).
- **(b)** Encrypted at rest with a passphrase-derived key cached in
  memory after unlock.
- **(c)** Device-bound non-extractable key (no passphrase). Breaks the
  backup story.

The user chose **(a)** for the foundation phase, on the basis that v1
runs only on their own phone, with themselves as the only user, in a
dogfood / prototype context. Building (b) now would delay reaching the
phone with a runnable app by roughly a week.

## Decision

v1 stores photos as plaintext blobs in IndexedDB. The export blob from
ADR-0002 remains encrypted, so backups never contain plaintext photos
at rest off-device.

## Shipping constraint (load-bearing)

This decision is **only** acceptable while the app is running on the
developer's own device. Before any of the following happens, photo
encryption-at-rest (option b) must be implemented:

- the app is installed on a second device (e.g. a partner's phone),
- the app is shared with a non-developer user for testing,
- the app accumulates real photos the user would be uncomfortable
  seeing in a forensic image of an unlocked phone.

The decision is reviewed at the same time as ADR-0002's backup-strategy
review (after real usage signal).

## Consequences

- The `Photo` domain entity ships in v1 with a plain `Blob` /
  `ArrayBuffer` payload. Field shape is unchanged when encryption is
  added later (encryption wraps the bytes; the reference doesn't
  change).
- The `lib/crypto/` module is still authored in v1 for the backup
  blob (ADR-0002) — so the primitives exist when we promote photos
  to encrypted-at-rest. No new dependency.
- Risk we accept: a browser-extension exploit, an unlocked-phone
  forensic image, or anyone with momentary access to the unlocked
  phone can read photos. The user accepts this for a single-device
  developer-only build.
- We *do not* claim "E2E encrypted photos" in any user-facing copy or
  marketing surface until (b) ships.
