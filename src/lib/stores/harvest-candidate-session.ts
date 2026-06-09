import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';
import { db } from '$lib/db/atopic-db';
import { DexieHarvestCandidateRepository } from '$lib/adapters/dexie-harvest-candidate-repository';
import type { HarvestCandidate } from '$lib/domain/harvest-candidate';
import type { Result } from '$lib/types/result';

const repo = new DexieHarvestCandidateRepository(db);

const store = readable<HarvestCandidate[]>([], (set) => {
  const subscription = liveQuery(() => db.harvest_candidates.toArray()).subscribe({
    next: (rows) => { set(rows ?? []); },
    error: () => { set([]); },
  });
  return () => subscription.unsubscribe();
});

async function upsert(candidate: HarvestCandidate): Promise<Result<void, string>> {
  return repo.upsert(candidate);
}

async function readByKey(normalizedKey: string): Promise<Result<HarvestCandidate | null, string>> {
  return repo.readByKey(normalizedKey);
}

export const harvestCandidateSession = { subscribe: store.subscribe, upsert, readByKey };
