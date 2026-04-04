import { db } from '$lib/adapters/dexie-db';
import type { FoodLog } from '$lib/domain/models';

let _logs = $state<FoodLog[]>([]);
let _loading = $state(false);
let _error = $state<string | null>(null);
let _syncStatus = $state<'synced' | 'syncing' | 'offline' | 'pending'>('synced');
let _selectedDate = $state(new Date().toISOString().slice(0, 10));

export const foodLogStore = {
  get logs() {
    return _logs;
  },
  get loading() {
    return _loading;
  },
  get error() {
    return _error;
  },
  get syncStatus() {
    return _syncStatus;
  },
  get selectedDate() {
    return _selectedDate;
  },

  setLogs(logs: FoodLog[]) {
    _logs = logs;
  },

  setSelectedDate(date: string) {
    _selectedDate = date;
  },

  /**
   * Load food logs for a date range from Dexie (offline-first), then fetch from server.
   */
  async loadForDateRange(childId: string, startDate: string, endDate: string): Promise<void> {
    _loading = true;
    _error = null;

    try {
      // Load from Dexie first (offline-first)
      const localLogs = await db.foodLogs
        .where('[childId+date]')
        .between([childId, startDate], [childId, endDate], true, true)
        .toArray();

      _logs = localLogs;

      // Then fetch from server and merge
      if (navigator.onLine) {
        try {
          const res = await fetch(
            `/api/food-logs?childId=${childId}&startDate=${startDate}&endDate=${endDate}`
          );

          if (res.ok) {
            const json = await res.json();
            if (json.ok) {
              const serverLogs: FoodLog[] = json.data;
              // Upsert server logs into Dexie
              await db.foodLogs.bulkPut(serverLogs);
              // Reload from Dexie to get merged state
              _logs = await db.foodLogs
                .where('[childId+date]')
                .between([childId, startDate], [childId, endDate], true, true)
                .toArray();
            }
          }
        } catch {
          // Offline or network error - local data is already displayed
          _syncStatus = 'offline';
        }
      } else {
        _syncStatus = 'offline';
      }
    } catch (err) {
      _error = err instanceof Error ? err.message : 'Chyba při načítání';
    } finally {
      _loading = false;
    }
  },

  /**
   * Create a new food log entry (optimistic update).
   */
  async createLog(
    childId: string,
    categoryId: string,
    date: string,
    action: 'eliminated' | 'reintroduced',
    createdBy: string,
    subItemId?: string,
    notes?: string
  ): Promise<FoodLog> {
    const now = new Date().toISOString();
    const newLog: FoodLog = {
      id: crypto.randomUUID(),
      childId,
      categoryId,
      subItemId,
      date,
      action,
      notes,
      createdBy,
      createdAt: now,
      updatedAt: now,
      syncedAt: undefined, // Not synced yet
    };

    // Optimistic update
    _logs = [..._logs, newLog];

    // Persist to Dexie
    await db.foodLogs.put(newLog);

    // Trigger background sync
    _syncStatus = 'pending';
    this.syncToServer();

    return newLog;
  },

  /**
   * Delete a food log entry (for undo functionality).
   */
  async deleteLog(id: string): Promise<void> {
    // Optimistic update
    _logs = _logs.filter((l) => l.id !== id);

    // Delete from Dexie
    await db.foodLogs.delete(id);

    // If the log was already synced, also delete from server
    if (navigator.onLine) {
      try {
        await fetch(`/api/food-logs/${id}`, { method: 'DELETE' });
      } catch {
        // Will be handled on next sync
      }
    }
  },

  /**
   * Replace all food logs for a set of dates: delete existing, then create new.
   * Offline-first: all mutations go to Dexie first. Server deletions are queued
   * in the pendingDeletes table and processed by syncToServer.
   */
  async replaceLogsForDates(
    childId: string,
    dates: string[],
    entries: Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const now = new Date().toISOString();

    // Find existing synced logs that need server-side deletion
    const existingLogs = _logs.filter(
      (l) => l.childId === childId && dates.includes(l.date)
    );
    const syncedIds = existingLogs.filter((l) => l.syncedAt).map((l) => l.id);

    // Queue server deletions for synced records
    if (syncedIds.length > 0) {
      const pendingDeletes = syncedIds.map((recordId) => ({
        id: crypto.randomUUID(),
        table: 'foodLogs',
        recordId,
        createdAt: now,
      }));
      await db.pendingDeletes.bulkPut(pendingDeletes);
    }

    // Delete all existing from Dexie (both synced and unsynced)
    const allExistingIds = existingLogs.map((l) => l.id);
    if (allExistingIds.length > 0) {
      await db.foodLogs.bulkDelete(allExistingIds);
    }

    // Create new logs
    const newLogs: FoodLog[] = entries.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      syncedAt: undefined,
    }));

    if (newLogs.length > 0) {
      await db.foodLogs.bulkPut(newLogs);
    }

    // Optimistic update: remove old, add new
    _logs = [
      ..._logs.filter((l) => !(l.childId === childId && dates.includes(l.date))),
      ...newLogs,
    ];

    // Trigger sync
    _syncStatus = 'pending';
    this.syncToServer();
  },

  /**
   * Bulk create food logs (for "copy from yesterday").
   */
  async createBulkLogs(
    entries: Array<Omit<FoodLog, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const now = new Date().toISOString();
    const newLogs: FoodLog[] = entries.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      syncedAt: undefined,
    }));

    // Optimistic update
    _logs = [..._logs, ...newLogs];

    // Persist to Dexie
    await db.foodLogs.bulkPut(newLogs);

    // Trigger background sync
    _syncStatus = 'pending';
    this.syncToServer();
  },

  /**
   * Sync unsynced logs to server: process pending deletes first, then push new records.
   */
  async syncToServer(): Promise<void> {
    if (!navigator.onLine) {
      _syncStatus = 'offline';
      return;
    }

    _syncStatus = 'syncing';

    try {
      // Step 1: Process pending deletes
      const pendingDeletes = await db.pendingDeletes
        .where('table')
        .equals('foodLogs')
        .toArray();

      const completedDeleteIds: string[] = [];
      for (const pd of pendingDeletes) {
        try {
          const res = await fetch(`/api/food-logs/${pd.recordId}`, { method: 'DELETE' });
          if (res.ok || res.status === 404) {
            completedDeleteIds.push(pd.id);
          }
        } catch {
          // Will retry on next sync cycle
        }
      }
      if (completedDeleteIds.length > 0) {
        await db.pendingDeletes.bulkDelete(completedDeleteIds);
      }

      // Step 2: Push unsynced records
      const unsyncedLogs = await db.foodLogs
        .filter((log) => log.syncedAt === undefined || log.syncedAt === null)
        .toArray();

      if (unsyncedLogs.length === 0 && completedDeleteIds.length === pendingDeletes.length) {
        _syncStatus = 'synced';
        return;
      }

      if (unsyncedLogs.length > 0) {
        const res = await fetch('/api/food-logs/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs: unsyncedLogs }),
        });

        if (res.ok) {
          const now = new Date().toISOString();
          const updates = unsyncedLogs.map((log) => ({
            key: log.id,
            changes: { syncedAt: now },
          }));
          await db.foodLogs.bulkUpdate(updates);
        }
      }

      // Check if everything is synced
      const remainingDeletes = await db.pendingDeletes
        .where('table')
        .equals('foodLogs')
        .count();
      const remainingUnsynced = await db.foodLogs
        .filter((log) => !log.syncedAt)
        .count();

      _syncStatus = remainingDeletes === 0 && remainingUnsynced === 0 ? 'synced' : 'pending';
    } catch {
      _syncStatus = 'offline';
    }
  },

  /**
   * Get unsynced count for UI indicator.
   */
  async getUnsyncedCount(): Promise<number> {
    return await db.foodLogs
      .filter((log) => log.syncedAt === undefined || log.syncedAt === null)
      .count();
  },
};

// Listen for online events to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    foodLogStore.syncToServer();
  });
}
