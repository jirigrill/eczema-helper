# Migration data-loss notice

**Rejected:** #665, 2026-08-12

## Request

Tell the mother when a Dexie schema migration deletes her logged data, since there
is no backup ([ADR-0029](../docs/adr/0029-no-crypto-no-backup.md)) and the deletion
is otherwise silent and unrecoverable. Raised as story 9 of #662, split out as #665
after #664 shipped without it.

## Why rejected

#664 narrowed the v12 delete from "wipe the whole `meals` table" (the original
#662 spec) to "delete only meals containing an `other:` item" — the meals whose
content came from the custom-food capability #662 removed. That is a small,
self-evident blast radius, not the broad silent wipe the original story worried
about. Building a general migration-notice surface (record-in-upgrade-hook,
render-on-next-load) for this narrowed case is disproportionate to what's lost.

## Revisit if

A future migration (v13+) has a broader or less self-evident blast radius than
"only rows using a feature that was just deleted" — the v7/v8/v10 wipe-on-shape-change
precedent means there will likely be another one eventually.
