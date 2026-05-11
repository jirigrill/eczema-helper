# 0002 — Encrypted manual export is the v1 backup floor

**Status:** Accepted
**Date:** 2026-05-11

## Context

[ADR-0001](0001-single-device-v1.md) puts all data on one phone. A single
hardware failure or lost-phone incident destroys a multi-month medical
journal. That is unacceptable to ship — a parent who loses six weeks of
careful logging will not reopen the app.

Four backup shapes were considered:

- **(a)** manual export, no nudge
- **(b)** manual export + scheduled nudges
- **(c)** opt-in encrypted cloud backup that we host
- **(d)** encrypted backup to the user's own cloud (iCloud Drive,
  Google Drive)

All four share the same primitive: a whole-state serializer plus an
encrypted blob (AES-256-GCM, passphrase-derived key via PBKDF2). They
differ only in who pushes the blob where.

## Decision

v1 ships the floor: **encrypted manual export and import.** The user
taps export, picks a passphrase, and the OS share sheet writes the blob
wherever they want (iCloud Drive, email-to-self, AirDrop to a laptop).
Restore is the inverse.

We defer the choice between (b), (c), and (d) until we have real usage
signal — do v1 users actually tap export, or never?

## Consequences

- The encrypted blob format becomes a stable contract. Future cloud
  backup is "add an uploader," not "redesign storage."
- Crypto primitives (Web Crypto API, PBKDF2, AES-256-GCM) are exercised
  on day one. Photo encryption can reuse the same key-derivation code.
- Stable locally-generated UUIDs are required for every persisted
  record — restore must not collide with anything already on the device.
- Risk we accept: a user who never taps export and then loses their
  phone has no recourse. v1 will surface this prominently in onboarding
  and after the first week of usage. If telemetry-free observation
  (asking real users) shows the floor is insufficient, we promote to
  (b) or (c) without schema change.
