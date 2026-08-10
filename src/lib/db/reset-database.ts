import { db } from '$lib/db/atopic-db';

/**
 * Factory reset — clears every table in the database.
 *
 * This is a database-lifecycle concern, not a domain one: no single session
 * store owns the wipe, so it deliberately sits outside the per-domain adapter
 * ownership rule (`docs/architecture/ports-and-adapters.md`) alongside the
 * `db` instance itself.
 *
 * The table list comes from `db.tables` rather than a hand-written set of
 * names. The predecessor (`settingsStore.reset()`, relocated here) enumerated
 * four tables and silently missed the five holding the mother's meals, skin
 * observations and photos — while the Settings copy promised to erase
 * everything. Reading the live table list means a table added by a future
 * migration is covered without anyone remembering to update this file.
 */
export async function resetDatabase(): Promise<void> {
  await Promise.all(db.tables.map((table) => table.clear()));
}
