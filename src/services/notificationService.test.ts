import { afterEach, describe, expect, it, vi } from 'vitest';
import { notificationService } from './notificationService';

describe('notificationService', () => {
  const originalNotification = window.Notification;

  afterEach(() => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: originalNotification,
    });
  });

  it('returns unsupported when Notification API is unavailable', () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    expect(notificationService.isSupported()).toBe(false);
    expect(notificationService.getPermission()).toBe('unsupported');
  });

  it('does not create a notification without granted permission', () => {
    const MockNotification = vi.fn();
    Object.defineProperty(MockNotification, 'permission', {
      configurable: true,
      value: 'denied',
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotification,
    });

    notificationService.notify('FocusFlow', 'Done');
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('creates a notification when permission is granted', () => {
    const MockNotification = vi.fn();
    Object.defineProperty(MockNotification, 'permission', {
      configurable: true,
      value: 'granted',
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotification,
    });

    notificationService.notify('FocusFlow', 'Done');
    expect(MockNotification).toHaveBeenCalledTimes(1);
  });
});
