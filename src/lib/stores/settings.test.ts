import { afterEach, describe, expect, it } from 'vitest';

import { db } from '$lib/db/atopic-db';

// The live settings store owns feeding-stage reads and setFeedingStage. We
// drive the exported write methods against the global fake-indexeddb singleton
// (installed by test-setup.ts) and read back what they persisted through the
// DexieSettingsRepository — the persistence boundary. The "start over" wipe is
// no longer a settings concern; see `db/reset-database.test.ts`.

afterEach(async () => {
  await db.settings.clear();
});

describe('settingsStore.setFeedingStage', () => {
  it('persists the new stage to the settings singleton', async () => {
    const { settingsStore } = await import('./settings.svelte');
    const { DexieSettingsRepository } = await import('$lib/adapters/dexie-settings-repository');

    await new DexieSettingsRepository(db).save({ feedingStage: 'breastfed' });

    const result = await settingsStore.setFeedingStage('mixed');
    expect(result).toMatchObject({ ok: true });

    const settings = await new DexieSettingsRepository(db).load();
    expect(settings).toMatchObject({ ok: true, data: { feedingStage: 'mixed' } });
  });

  it('seeds a fresh row when settings is unseeded', async () => {
    const { settingsStore } = await import('./settings.svelte');
    const { DexieSettingsRepository } = await import('$lib/adapters/dexie-settings-repository');

    // No prior write — the settings singleton has never been seeded.
    const result = await settingsStore.setFeedingStage('solids');
    expect(result).toMatchObject({ ok: true });

    const settings = await new DexieSettingsRepository(db).load();
    expect(settings).toMatchObject({ ok: true, data: { feedingStage: 'solids' } });
  });
});

