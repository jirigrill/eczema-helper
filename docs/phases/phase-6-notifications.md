# Phase 6: Push Notifications & Reminders

## Summary

This phase adds Web Push notifications to the Eczema Tracker PWA, enabling parents to receive timely reminders for food logging and progress photos. The system uses the Web Push API with VAPID authentication, a server-side scheduler (node-cron) for dispatching notifications, and a service worker for receiving and displaying them. Reminder configuration is exposed through the existing settings page. Special attention is given to iOS compatibility, where Web Push only works when the PWA is installed to the home screen (iOS 16.4+).

## Prerequisites

- **Phase 0**: PWA foundation with service worker registered and functional.
- **Phase 1**: Authentication system in place (cookie-based sessions, user/child models).
- PostgreSQL 16 running with existing schema migrations.
- VAPID key pair generated and stored in environment variables.
- The `web-push` npm package installed on the server.
- The `node-cron` npm package installed on the server.

## Features

1. **Web Push setup**: VAPID key generation script, service worker push event handler, notification display logic.
2. **Push subscription flow**: Request notification permission from the user, subscribe via the Push API, persist the subscription (endpoint + keys) to the server.
3. **Reminder configuration page**: UI in settings for enabling/disabling reminders, setting times, and configuring intervals. All labels in Czech.
4. **Server-side cron job**: Periodic task that checks `reminder_configs` and `push_subscriptions` tables, determines which reminders are due, and sends push notifications via the `web-push` library.
5. **Food log reminder**: "Dnešní záznam jídla pomůže lépe sledovat změny." notification sent at a configurable evening time (default 20:00). Only sent if no food log entry exists for the current day.
6. **Photo reminder**: "{childName}: Kontrolní fotka pomůže vidět pokrok." notification sent at a configurable interval (default every 3 days) and time (default 10:00). Only sent if no photo was taken within the configured interval.

> **Note:** Include the child's name in photo reminders for personalization. Avoid question format ('Did you...?') as it implies judgment.

## Acceptance Criteria

1. A VAPID key generation script exists and produces a valid key pair suitable for storage in `.env`.
2. The service worker handles `push` events and displays notifications with the correct Czech text, icon, and click action.
3. Users can grant notification permission through a clear UI prompt in settings.
4. Upon granting permission, the browser creates a push subscription and the client sends it to `POST /api/push` where it is stored in PostgreSQL.
5. Users can revoke their subscription via `DELETE /api/push`, which removes it from the database.
6. The settings page displays toggle switches for food log and photo reminders, with time and interval pickers.
7. Reminder configuration is persisted per user per child in the `reminder_configs` table.
8. The server-side cron job runs every minute, evaluates due reminders, and dispatches push notifications only when conditions are met (no log today for food reminders; interval elapsed for photo reminders).
9. Clicking a notification opens the app to the relevant section (food log page or photo capture page).
10. On iOS, the app detects whether it is running as an installed PWA and shows an informational message if not, explaining that notifications require home screen installation.
11. If a push subscription becomes invalid (endpoint returns 410 Gone), the server removes it from the database automatically.
12. All notification-related UI text is in Czech.

## Implementation Details

### Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `scripts/generate-vapid-keys.ts` | Create | CLI script to generate VAPID key pair and output for `.env` |
| `src/lib/domain/ports/notifications.ts` | Create | Port interface for notification operations |
| `src/lib/adapters/web-push.ts` | Create | Server-side adapter: wraps `web-push` library, sends notifications |
| `src/lib/domain/services/notification-scheduler.ts` | Create | Cron scheduling logic: determines which reminders are due |
| `src/lib/server/cron.ts` | Create | Server-side cron job entry point using `node-cron` |
| `src/routes/api/push/+server.ts` | Create | API endpoints for push subscription management |
| `src/routes/(app)/settings/+page.svelte` | Modify | Add reminder configuration UI section |
| `src/routes/(app)/settings/+page.server.ts` | Modify | Add server-side load/save for reminder configs |
| `static/sw.js` (or vite-pwa config) | Modify | Add `push` and `notificationclick` event handlers |
| `src/lib/stores/notification.ts` | Create | Svelte store for notification permission state |
| `src/lib/utils/ios-detection.ts` | Create | Utility to detect iOS and standalone PWA mode |
| `.env.example` | Modify | Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| `migrations/XXXX_push_subscriptions.sql` | Create | Database migration for `push_subscriptions` table |
| `migrations/XXXX_reminder_configs.sql` | Create | Database migration for `reminder_configs` table |

### Step-by-Step Instructions

#### Step 1: Generate VAPID Keys

Create the script `scripts/generate-vapid-keys.ts`:

```typescript
import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
```

Run with `npx tsx scripts/generate-vapid-keys.ts` and copy the output into `.env`.

#### Step 2: Create Database Migrations

**push_subscriptions table:**

```sql
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

**reminder_configs table:**

```sql
CREATE TABLE reminder_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    food_log_reminder BOOLEAN NOT NULL DEFAULT false,
    food_log_reminder_time TIME NOT NULL DEFAULT '20:00',
    photo_reminder BOOLEAN NOT NULL DEFAULT false,
    photo_reminder_interval_days INTEGER NOT NULL DEFAULT 3,
    photo_reminder_time TIME NOT NULL DEFAULT '10:00',
    last_photo_notification_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, child_id)
);
```

**Schema note:** The authoritative schema for `push_subscriptions` and `reminder_configs` is defined in Phase 1's `001_initial_schema.sql` migration. This phase does NOT create these tables — it uses the existing schema. If additional columns are needed (such as `last_photo_notification_at`), add them via a new migration file (e.g., `004_notification_enhancements.sql`).

#### Step 3: Define the Notifications Port

Create `src/lib/domain/ports/notifications.ts`:

```typescript
export interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface ReminderConfig {
    userId: string;
    childId: string;
    foodLogReminder: boolean;
    foodLogReminderTime: string;       // "HH:MM" format, e.g. "20:00"
    photoReminder: boolean;
    photoReminderIntervalDays: number;  // e.g. 3
    photoReminderTime: string;          // "HH:MM" format, e.g. "10:00"
    quietHoursStart?: string;           // "HH:MM" format, e.g. "22:00" (disabled if not set)
    quietHoursEnd?: string;             // "HH:MM" format, e.g. "07:00" (disabled if not set)
}

**Snooze:** Notifications include an action button "Za hodinu" (In an hour) that reschedules the reminder for 1 hour later via the service worker's notification action handler.

**Quiet hours:** Add a `quietHoursStart` and `quietHoursEnd` field to `ReminderConfig` (e.g., 22:00–07:00). The cron scheduler skips notifications during quiet hours. Default: disabled. Czech parents of newborns are often awake at night but cannot act on reminders during feedings.

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag: string;
    data?: {
        url: string;
    };
}

export interface NotificationService {
    subscribe(userId: string, subscription: PushSubscriptionData, userAgent?: string): Promise<void>;
    unsubscribe(userId: string, endpoint: string): Promise<void>;
    getSubscriptions(userId: string): Promise<PushSubscriptionData[]>;
    removeInvalidSubscription(endpoint: string): Promise<void>;
    sendNotification(subscription: PushSubscriptionData, payload: NotificationPayload): Promise<boolean>;
    getReminderConfig(userId: string, childId: string): Promise<ReminderConfig | null>;
    saveReminderConfig(config: ReminderConfig): Promise<void>;
}
```

#### Step 4: Implement the Web Push Adapter

Create `src/lib/adapters/web-push.ts`:

```typescript
import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '$env/static/private';
import type { NotificationService, PushSubscriptionData, NotificationPayload } from '$lib/domain/ports/notifications';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export class WebPushAdapter implements NotificationService {
    constructor(private db: /* your DB pool type */) {}

    async subscribe(userId: string, subscription: PushSubscriptionData, userAgent?: string): Promise<void> {
        await this.db.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (endpoint) DO UPDATE SET
                p256dh_key = EXCLUDED.p256dh_key,
                auth_key = EXCLUDED.auth_key,
                user_agent = EXCLUDED.user_agent,
                updated_at = NOW()`,
            [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent]
        );
    }

    async unsubscribe(userId: string, endpoint: string): Promise<void> {
        await this.db.query(
            'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
            [userId, endpoint]
        );
    }

    async getSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
        const result = await this.db.query(
            'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1',
            [userId]
        );
        return result.rows.map((row: any) => ({
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh_key, auth: row.auth_key }
        }));
    }

    async removeInvalidSubscription(endpoint: string): Promise<void> {
        await this.db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    }

    async sendNotification(subscription: PushSubscriptionData, payload: NotificationPayload): Promise<boolean> {
        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
                },
                JSON.stringify(payload)
            );
            return true;
        } catch (error: any) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                await this.removeInvalidSubscription(subscription.endpoint);
            }
            return false;
        }
    }

    async getReminderConfig(userId: string, childId: string): Promise<ReminderConfig | null> {
        const result = await this.db.query(
            'SELECT * FROM reminder_configs WHERE user_id = $1 AND child_id = $2',
            [userId, childId]
        );
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            userId: row.user_id,
            childId: row.child_id,
            foodLogReminder: row.food_log_reminder,
            foodLogReminderTime: row.food_log_reminder_time.substring(0, 5),
            photoReminder: row.photo_reminder,
            photoReminderIntervalDays: row.photo_reminder_interval_days,
            photoReminderTime: row.photo_reminder_time.substring(0, 5)
        };
    }

    async saveReminderConfig(config: ReminderConfig): Promise<void> {
        await this.db.query(
            `INSERT INTO reminder_configs (user_id, child_id, food_log_reminder, food_log_reminder_time,
                photo_reminder, photo_reminder_interval_days, photo_reminder_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id, child_id) DO UPDATE SET
                food_log_reminder = EXCLUDED.food_log_reminder,
                food_log_reminder_time = EXCLUDED.food_log_reminder_time,
                photo_reminder = EXCLUDED.photo_reminder,
                photo_reminder_interval_days = EXCLUDED.photo_reminder_interval_days,
                photo_reminder_time = EXCLUDED.photo_reminder_time,
                updated_at = NOW()`,
            [config.userId, config.childId, config.foodLogReminder, config.foodLogReminderTime,
             config.photoReminder, config.photoReminderIntervalDays, config.photoReminderTime]
        );
    }
}
```

#### Step 5: Implement the Notification Scheduler

Create `src/lib/domain/services/notification-scheduler.ts`:

```typescript
import type { NotificationService, NotificationPayload } from '$lib/domain/ports/notifications';

interface SchedulerDependencies {
    notifications: NotificationService;
    db: /* your DB pool type */;
}

export class NotificationScheduler {
    constructor(private deps: SchedulerDependencies) {}

    /**
     * Determine which food log reminders are due right now.
     * A food log reminder is due if:
     * 1. food_log_reminder is enabled
     * 2. Current time matches food_log_reminder_time (within the same minute)
     * 3. User has NOT logged any food entry today for the given child
     */
    async getDueFoodLogReminders(now: Date): Promise<Array<{ userId: string; childId: string; childName: string }>> {
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const result = await this.deps.db.query(
            `SELECT rc.user_id, rc.child_id, c.name as child_name
             FROM reminder_configs rc
             JOIN children c ON c.id = rc.child_id
             WHERE rc.food_log_reminder = true
               AND rc.food_log_reminder_time = $1
               AND NOT EXISTS (
                   SELECT 1 FROM food_logs fl
                   WHERE fl.child_id = rc.child_id
                     AND fl.created_at >= $2
               )`,
            [currentTime, todayStart.toISOString()]
        );
        return result.rows.map((r: any) => ({
            userId: r.user_id,
            childId: r.child_id,
            childName: r.child_name
        }));
    }

    /**
     * Determine which photo reminders are due right now.
     * A photo reminder is due if:
     * 1. photo_reminder is enabled
     * 2. Current time matches photo_reminder_time (within the same minute)
     * 3. The last photo notification was sent >= photo_reminder_interval_days ago
     *    (or has never been sent)
     */
    async getDuePhotoReminders(now: Date): Promise<Array<{ userId: string; childId: string; childName: string }>> {
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const result = await this.deps.db.query(
            `SELECT rc.user_id, rc.child_id, c.name as child_name
             FROM reminder_configs rc
             JOIN children c ON c.id = rc.child_id
             WHERE rc.photo_reminder = true
               AND rc.photo_reminder_time = $1
               AND (
                   rc.last_photo_notification_at IS NULL
                   OR rc.last_photo_notification_at + (rc.photo_reminder_interval_days || ' days')::interval <= $2
               )`,
            [currentTime, now.toISOString()]
        );
        return result.rows.map((r: any) => ({
            userId: r.user_id,
            childId: r.child_id,
            childName: r.child_name
        }));
    }

    async sendFoodLogReminders(now: Date): Promise<number> {
        const dueReminders = await this.getDueFoodLogReminders(now);
        let sentCount = 0;

        for (const reminder of dueReminders) {
            const subscriptions = await this.deps.notifications.getSubscriptions(reminder.userId);
            const payload: NotificationPayload = {
                title: 'Sledování ekzému',
                body: 'Dnešní záznam jídla pomůže lépe sledovat změny.',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                tag: `food-log-${reminder.childId}-${now.toISOString().slice(0, 10)}`,
                data: { url: '/food-log' }
            };

            for (const sub of subscriptions) {
                const success = await this.deps.notifications.sendNotification(sub, payload);
                if (success) sentCount++;
            }
        }

        return sentCount;
    }

    async sendPhotoReminders(now: Date): Promise<number> {
        const dueReminders = await this.getDuePhotoReminders(now);
        let sentCount = 0;

        for (const reminder of dueReminders) {
            const subscriptions = await this.deps.notifications.getSubscriptions(reminder.userId);
            const payload: NotificationPayload = {
                title: 'Sledování ekzému',
                body: `${reminder.childName}: Kontrolní fotka pomůže vidět pokrok.`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                tag: `photo-${reminder.childId}`,
                data: { url: '/photos/capture' }
            };

            for (const sub of subscriptions) {
                const success = await this.deps.notifications.sendNotification(sub, payload);
                if (success) sentCount++;
            }

            // Update last_photo_notification_at
            await this.deps.db.query(
                `UPDATE reminder_configs SET last_photo_notification_at = $1
                 WHERE user_id = $2 AND child_id = $3`,
                [now.toISOString(), reminder.userId, reminder.childId]
            );
        }

        return sentCount;
    }

    async runScheduledCheck(): Promise<void> {
        const now = new Date();
        await this.sendFoodLogReminders(now);
        await this.sendPhotoReminders(now);
    }
}
```

#### Step 6: Set Up the Server-Side Cron Job

Create `src/lib/server/cron.ts`:

```typescript
import cron from 'node-cron';
import { NotificationScheduler } from '$lib/domain/services/notification-scheduler';

let cronJob: cron.ScheduledTask | null = null;

export function startNotificationCron(scheduler: NotificationScheduler): void {
    if (cronJob) return;

    // Run every minute to check for due reminders
    cronJob = cron.schedule('* * * * *', async () => {
        try {
            await scheduler.runScheduledCheck();
        } catch (error) {
            console.error('[NotificationCron] Error during scheduled check:', error);
        }
    });

    console.log('[NotificationCron] Started notification scheduler');
}

export function stopNotificationCron(): void {
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
        console.log('[NotificationCron] Stopped notification scheduler');
    }
}
```

Initialize the cron job in your SvelteKit server hooks or startup file so it runs when the server starts.

**Missed windows on restart:** If the app container restarts, the `node-cron` scheduler resets. Reminders due during the restart window are missed. To mitigate, on cron start, check for any reminders that should have fired since the last recorded check time:

```typescript
// On scheduler startup
const lastCheck = await getLastCronCheckTime();
if (lastCheck && Date.now() - lastCheck.getTime() > 2 * 60 * 1000) {
  // More than 2 minutes since last check — catch up
  await processScheduledReminders();
}
```

#### Step 7: Create the Push Subscription API

Create `src/routes/api/push/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    const session = locals.session;
    if (!session?.userId) throw error(401, 'Neprihlaseny');

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw error(400, 'Neplatna subscription data');
    }

    const userAgent = request.headers.get('user-agent') ?? undefined;

    await locals.notifications.subscribe(session.userId, { endpoint, keys }, userAgent);

    return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
    const session = locals.session;
    if (!session?.userId) throw error(401, 'Neprihlaseny');

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
        throw error(400, 'Chybi endpoint');
    }

    await locals.notifications.unsubscribe(session.userId, endpoint);

    return json({ success: true });
};
```

#### Step 8: Add Service Worker Push Handling

Add the following to `static/sw.js` (or your Vite PWA service worker config):

```javascript
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const payload = event.data.json();
    const options = {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        tag: payload.tag,
        data: payload.data,
        vibrate: [200, 100, 200],
        requireInteraction: true
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus existing window if open
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new window
            return clients.openWindow(url);
        })
    );
});
```

#### Step 9: Create the Notification Permission Store

Create `src/lib/stores/notification.svelte.ts`:

```typescript
// src/lib/stores/notification.svelte.ts (Svelte 5 runes)
export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

let permission = $state<NotificationPermissionState>(getInitialPermission());
let subscribed = $state(false);

function getInitialPermission(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as NotificationPermissionState;
}

export function getPermission() { return permission; }
export function getIsSubscribed() { return subscribed; }

export async function requestPermission(): Promise<NotificationPermissionState> {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    permission = result as NotificationPermissionState;
    return permission;
}

export async function subscribePush(vapidPublicKey: string): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        const response = await fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription.toJSON())
        });

        if (response.ok) { subscribed = true; return true; }
        return false;
    } catch (err) {
        console.error('Failed to subscribe to push:', err);
        return false;
    }
}

export async function unsubscribePush(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await fetch('/api/push', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });
            await subscription.unsubscribe();
        }
        subscribed = false;
        return true;
    } catch (err) {
        console.error('Failed to unsubscribe from push:', err);
        return false;
    }
}

export async function checkSubscription(): Promise<void> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        subscribed = sub !== null;
    } catch {
        subscribed = false;
    }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
```

#### Step 10: Create iOS Detection Utility

Create `src/lib/utils/ios-detection.ts`:

```typescript
export function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isStandalonePWA(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        ('standalone' in navigator && (navigator as any).standalone === true) ||
        window.matchMedia('(display-mode: standalone)').matches
    );
}

export function canReceivePushNotifications(): boolean {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (isIOS() && !isStandalonePWA()) return false;
    return true;
}
```

#### Step 11: Update the Settings Page

Modify `src/routes/(app)/settings/+page.svelte` to add a reminder configuration section. The section should include:

- A notification permission banner (with iOS-specific messaging if applicable).
- A toggle for "Pripominky zaznamu jidla" (Food log reminders) with a time picker for the reminder time.
- A toggle for "Pripominky fotek" (Photo reminders) with a time picker and an interval selector (in days).
- A save button that persists the configuration via a form action.

The iOS-specific banner should display when `isIOS() && !isStandalonePWA()` is true, with the text: "Pro prijem notifikaci na iOS je nutne nainstalovat aplikaci na domovskou obrazovku. Klepnete na ikonu Sdileni a vyberte 'Pridat na plochu'."

#### Step 12: Update Settings Server Load and Action

Modify `src/routes/(app)/settings/+page.server.ts` to:

1. Load the current `ReminderConfig` for the active child in the `load` function.
2. Add a form action (e.g., `saveReminders`) that validates and persists the submitted reminder configuration.
3. Return the current notification subscription status if possible (by checking if any `push_subscriptions` rows exist for the user).

### Key Code Patterns

**Ports & Adapters**: The `NotificationService` interface defines all notification operations. The `WebPushAdapter` implements this interface using the `web-push` library and PostgreSQL. The adapter is injected via `locals` in SvelteKit hooks.

**Cron scheduling logic**: The `NotificationScheduler` queries the database each minute, comparing the current time (HH:MM) against configured reminder times. This avoids maintaining in-memory timers and survives server restarts. The query filters ensure reminders are only sent when their conditions are met (no food log today, photo interval elapsed).

**Subscription lifecycle**: Subscriptions are stored with their full PushSubscription data (endpoint + p256dh + auth keys). The `UNIQUE` constraint on `endpoint` ensures no duplicate subscriptions. Expired or revoked subscriptions (HTTP 410 from the push service) are automatically cleaned up.

**iOS compatibility**: The `canReceivePushNotifications()` utility gates the entire notification UI. On iOS devices that are not running as an installed PWA, the settings page shows an installation prompt instead of notification toggles.

## Post-Implementation State

Users can navigate to the settings page and configure push notification reminders for food logging and progress photos. When enabled, the server-side cron job evaluates due reminders every minute and dispatches push notifications via the Web Push protocol. Food log reminders fire at the configured evening time only if no food entry exists for the day. Photo reminders fire at the configured time after the specified interval has elapsed since the last notification. Clicking a notification opens the app to the relevant section (food log or photo capture). On iOS, the app gracefully handles the requirement for home screen installation before push notifications can function. Invalid subscriptions are automatically cleaned up when push endpoints return error responses.

## Test Suite

### Unit Tests

1. **NotificationScheduler.getDueFoodLogReminders**
   - Given a user with food_log_reminder enabled and food_log_reminder_time = "20:00", when `now` is 20:00 and no food log exists today, the reminder is returned.
   - Given a user with food_log_reminder enabled and food_log_reminder_time = "20:00", when `now` is 20:00 and a food log exists today, the reminder is NOT returned.
   - Given a user with food_log_reminder disabled, even at the correct time, no reminder is returned.
   - Given multiple users with different reminder times, only those matching the current time are returned.
   - Edge case: `now` at 23:59 with reminder time "23:59" and no food log today returns the reminder.
   - Edge case: `now` at 00:00 (midnight) with reminder time "00:00" checks food logs for the new day, not the previous day.

2. **NotificationScheduler.getDuePhotoReminders**
   - Given a user with photo_reminder enabled, interval = 3 days, last notification 3 days ago, and matching time, the reminder is returned.
   - Given a user with photo_reminder enabled, interval = 3 days, last notification 1 day ago, the reminder is NOT returned.
   - Given a user with photo_reminder enabled and `last_photo_notification_at` = NULL (never sent), the reminder is returned at the correct time.
   - Given a user with photo_reminder disabled, no reminder is returned regardless of interval.
   - Edge case: interval of 1 day triggers daily.
   - Edge case: interval of 0 days (invalid) does not cause errors.

3. **NotificationPayload construction**
   - Food log reminder payload has title "Sledování ekzému", body "Dnešní záznam jídla pomůže lépe sledovat změny.", tag containing the child ID and date, and data.url = "/food-log".
   - Photo reminder payload has title "Sledování ekzému", body containing the child's name and "Kontrolní fotka pomůže vidět pokrok.", tag containing the child ID, and data.url = "/photos/capture".
   - Payloads include icon and badge paths.

4. **WebPushAdapter.sendNotification**
   - On successful send, returns `true`.
   - On 410 Gone response, calls `removeInvalidSubscription` and returns `false`.
   - On 404 Not Found response, calls `removeInvalidSubscription` and returns `false`.
   - On network error (e.g., ECONNREFUSED), returns `false` without removing the subscription.

5. **iOS detection utilities**
   - `isIOS()` returns `true` for iPhone user agent strings, `false` for Android and desktop.
   - `isStandalonePWA()` returns `true` when `navigator.standalone` is `true` or display-mode media query matches.
   - `canReceivePushNotifications()` returns `false` on iOS when not standalone, `true` on iOS when standalone, `true` on Android/desktop with PushManager support.

6. **urlBase64ToUint8Array**
   - Correctly converts a VAPID public key from URL-safe Base64 to a Uint8Array.
   - Handles keys of varying lengths (with and without padding).

### Integration Tests

1. **Push subscription API (POST /api/push)**
   - Authenticated user sends a valid subscription object; verify it is stored in `push_subscriptions` table with correct fields.
   - Sending the same endpoint again updates the existing row (upsert behavior) rather than creating a duplicate.
   - Unauthenticated request returns 401.
   - Request missing required fields (endpoint, p256dh, auth) returns 400.

2. **Push unsubscription API (DELETE /api/push)**
   - Authenticated user sends endpoint; verify the row is removed from `push_subscriptions`.
   - Attempting to unsubscribe an endpoint belonging to another user has no effect (does not delete).
   - Unauthenticated request returns 401.

3. **Reminder config save and load**
   - Save a reminder config via the settings form action; load it back and verify all fields match.
   - Updating an existing config (changing times/intervals) correctly updates the row.
   - Default values are applied when fields are omitted.

4. **Cron job execution**
   - Start the cron job, advance the clock to a due reminder time, verify that `sendNotification` is called with the correct payload.
   - After sending a photo reminder, verify `last_photo_notification_at` is updated in the database.
   - When no reminders are due, verify no notifications are sent.

5. **Invalid subscription cleanup**
   - Insert a push subscription, simulate a 410 response from the push service, verify the subscription is removed from the database after the next send attempt.

### E2E / Manual Tests

1. **Full permission to subscribe to receive flow**
   - Open the settings page on a supported browser (Chrome/Edge on desktop or Android).
   - Click "Povolit notifikace" (Enable notifications).
   - Accept the browser permission prompt.
   - Verify the UI updates to show "Notifikace povoleny" (Notifications enabled).
   - Enable food log reminder, set time to 1 minute from now.
   - Wait for the cron to fire; verify a push notification appears with the text "Dnešní záznam jídla pomůže lépe sledovat změny."
   - Click the notification; verify the app opens to the food log page.

2. **Photo reminder end-to-end**
   - Enable photo reminders with interval = 1 day and time = 1 minute from now.
   - Wait for the notification containing the child's name and "Kontrolní fotka pomůže vidět pokrok."
   - Click the notification; verify the app opens to the photo capture page.
   - Verify the notification does not fire again for the configured interval.

3. **Unsubscribe flow**
   - With notifications enabled, click "Vypnout notifikace" (Disable notifications) in settings.
   - Verify the push subscription is removed (check database).
   - Verify no further notifications are received at the configured times.

4. **iOS-specific behavior**
   - On an iPhone with iOS 16.4+, open the app in Safari (not installed).
   - Verify the settings page shows the installation prompt instead of notification toggles.
   - Add the app to the home screen and reopen it.
   - Verify the notification toggles now appear and the subscription flow works.
   - On an iPhone with iOS < 16.4, verify the notification section shows "Notifikace nejsou na tomto zarizeni podporovany" (Notifications are not supported on this device).

5. **Notification click behavior**
   - When the app is already open in the foreground, clicking a notification navigates to the target URL within the existing window.
   - When the app is closed, clicking a notification opens a new window/tab at the target URL.

6. **Multiple devices**
   - Log in on two devices, enable notifications on both.
   - Verify that reminders are received on both devices when due.
   - Unsubscribe on one device; verify the other device still receives notifications.

### Regression Checks

1. Verify that existing service worker functionality (offline caching, asset precaching) still works after adding push event handlers.
2. Verify that the settings page still loads and saves non-notification settings correctly after the UI additions.
3. Verify that the authentication flow is unaffected by the new API routes (session cookies are properly checked).
4. Verify that the cron job does not interfere with normal server request handling (no blocking, no memory leaks from uncaught promise rejections).
5. Verify that uninstalling the PWA on a device removes the push subscription cleanly (the server handles the 410 response on next send attempt).
6. Confirm that database migrations for `push_subscriptions` and `reminder_configs` do not affect existing tables or data.
