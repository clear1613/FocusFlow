export const notificationService = {
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.Notification !== 'undefined'
    );
  },

  getPermission(): NotificationPermission | 'unsupported' {
    return this.isSupported() ? window.Notification.permission : 'unsupported';
  },

  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';
    return window.Notification.requestPermission();
  },

  notify(title: string, body: string): void {
    if (!this.isSupported() || window.Notification.permission !== 'granted') {
      return;
    }

    try {
      new window.Notification(title, { body });
    } catch (error) {
      console.warn('[FocusFlow] Notification failed.', error);
    }
  },
};
