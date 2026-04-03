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
              // Replace local data for this range with server truth:
              // 1. Delete local records for this range (removes stale data)
              const localIds = localLogs.map((l) => l.id);
              if (localIds.length > 0) {
                await db.foodLogs.bulkDelete(localIds);
              }
              // 2. Insert server records
              if (serverLogs.length > 0) {
                await db.foodLogs.bulkPut(serverLogs);
              }
              // 3. Re-add any unsynced local records (not yet on server)
              const unsyncedLocal = localLogs.filter(
                (l) => !l.syncedAt && !serverLogs.some((s) => s.id === l.id)
              );
              if (unsyncedLocal.length > 0) {
                await db.foodLogs.bulkPut(unsyncedLocal);
              }
              // Reload from Dexie
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
   * Sync unsynced logs to server.
   */
  async syncToServer(): Promise<void> {
    if (!navigator.onLine) {
      _syncStatus = 'offline';
      return;
    }

    _syncStatus = 'syncing';

    try {
      const unsyncedLogs = await db.foodLogs
        .filter((log) => log.syncedAt === undefined || log.syncedAt === null)
        .toArray();

      if (unsyncedLogs.length === 0) {
        _syncStatus = 'synced';
        return;
      }

      const res = await fetch('/api/food-logs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: unsyncedLogs }),
      });

      if (res.ok) {
        const now = new Date().toISOString();
        // Mark as synced in Dexie
        const updates = unsyncedLogs.map((log) => ({
          key: log.id,
          changes: { syncedAt: now },
        }));
        await db.foodLogs.bulkUpdate(updates);
        _syncStatus = 'synced';
      } else {
        _syncStatus = 'pending';
      }
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
