# 0001 — Single-device for v1

**Status:** Accepted
**Date:** 2026-05-11

## Context

The app is described as "single-child, two-parent". A two-parent household
could mean either parent logs from their own phone (mirrored across
devices) or that one parent logs on their device and the other simply
asks.

The protocol the app supports is a breastfeeding-era elimination diet:
the mother eats, allergens transit through breastmilk, the baby reacts.
The actor doing the eating-and-logging is therefore the mother.

Supporting two devices with mirrored data requires: a server (or P2P
sync), identity, auth, conflict resolution on concurrent writes, and a
key-exchange mechanism so an end-to-end encryption key can reach the
second device without ever existing in plaintext on the server. All of
this for medical data subject to GDPR.

## Decision

v1 is a single-device app. All data lives in IndexedDB (via Dexie) on
one phone — the mother's. No server. No accounts. No sync.

If the co-parent needs visibility, v1.5 will add an export (PDF / share
sheet) — also useful for the pediatrician.

## Consequences

- No auth layer, no server hosting, no GDPR-as-controller burden for a
  user database. The app is a local journal; the user holds the data.
- Device loss = data loss unless a backup mechanism exists. A backup /
  export story must be designed *before* the first user trusts the app
  with three months of medical observations. (See ADR-0002.)
- Photos can be encrypted at rest with a passphrase-derived key without
  needing to design a multi-device key-distribution scheme.
- IDs in the schema can be locally-generated UUIDs without coordination.
  No vector clocks, no last-write-wins logic, no merge UI.
- Retrofitting sync later means a real migration: stable IDs are fine,
  but conflict resolution and key distribution become design problems
  the first time two devices write to the same record.
