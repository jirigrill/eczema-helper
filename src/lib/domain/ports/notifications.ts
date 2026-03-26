export interface NotificationService {
  sendNotification(
    userId: string,
    payload: {
      title: string;
      body: string;
      url?: string;
      tag?: string;
    }
  ): Promise<void>;

  sendReminder(
    userId: string,
    childId: string,
    type: 'food_log' | 'photo'
  ): Promise<void>;

  processScheduledReminders(): Promise<void>;
}
