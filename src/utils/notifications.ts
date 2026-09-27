import { Capacitor } from '@capacitor/core';
import type { Holiday } from '../db/types';
import { parseISODate, todayISO } from './dates';

/** Notifications fire at 9am local time — morning of, not middle of the night. */
const REMINDER_HOUR = 9;

/**
 * Reminders start off. Turning them on is what asks for the notification
 * permission, so it happens when someone chooses it in Settings rather than
 * as a surprise while adding their first holiday.
 */
export const DEFAULT_REMINDER_DAYS = 0;

/**
 * The saved "days before" setting. Nothing saved means the default — which
 * has to be checked for explicitly, because `Number(null)` is 0 and would
 * pass for a real choice.
 */
export function parseReminderDays(saved: string | null): number {
  if (saved === null || saved.trim() === '') return DEFAULT_REMINDER_DAYS;
  const days = Number(saved);
  return Number.isInteger(days) && days >= 0 ? days : DEFAULT_REMINDER_DAYS;
}

export function remindersSupported(): boolean {
  // The plugin is native-only; the browser build has no equivalent.
  return Capacitor.isNativePlatform();
}

export type ReminderResult =
  | { status: 'scheduled'; count: number }
  | { status: 'off' }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

/**
 * Replace all scheduled reminders with one per upcoming holiday.
 *
 * Always clears first: the alternative is duplicate notifications every time
 * the setting is touched, and there is no way for a user to clear those.
 */
export async function rescheduleReminders(
  days: number,
  holidays: Holiday[],
): Promise<ReminderResult> {
  if (!remindersSupported()) return { status: 'unsupported' };

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    if (days <= 0) return { status: 'off' };

    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return { status: 'denied' };

    const now = new Date();
    const today = todayISO();
    const notifications = holidays
      .filter((holiday) => holiday.start_date >= today)
      .map((holiday) => {
        const at = parseISODate(holiday.start_date);
        at.setDate(at.getDate() - days);
        at.setHours(REMINDER_HOUR, 0, 0, 0);
        return { holiday, at };
      })
      // A reminder whose moment has passed would fire immediately.
      .filter((item) => item.at.getTime() > now.getTime())
      .map((item) => ({
        id: item.holiday.id,
        title: item.holiday.name,
        body:
          days === 1
            ? 'Starts tomorrow. Any gaps left to fill?'
            : `Starts in ${days} days. Any gaps left to fill?`,
        // A reminder a week ahead does not need to-the-minute timing. Asking
        // for an exact alarm makes the plugin open Android's "Alarms &
        // reminders" settings page on Android 14+, where exact alarms are off
        // by default — on every save once reminders are on. Inexact but
        // allowed while idle still arrives within minutes, even in Doze.
        schedule: { at: item.at, allowWhileIdle: true },
        isExactNotification: false,
      }));

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
    return { status: 'scheduled', count: notifications.length };
  } catch (error) {
    return { status: 'error', message: (error as Error).message };
  }
}

/**
 * Re-sync reminders from whatever is currently saved.
 *
 * Called after any change to the holidays themselves: scheduling only when the
 * setting changes would mean a holiday added later never got a reminder, and a
 * deleted one kept firing.
 */
export async function syncReminders(): Promise<ReminderResult> {
  if (!remindersSupported()) return { status: 'unsupported' };
  const { getSetting } = await import('../db/settings');
  const { listHolidays } = await import('../db/holidays');

  const days = parseReminderDays(await getSetting('reminder_days'));
  return rescheduleReminders(days, await listHolidays());
}

/** Remove every scheduled reminder, e.g. after wiping all data. */
export async function cancelAllReminders(): Promise<void> {
  if (!remindersSupported()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {
    // Nothing useful to do if the platform refuses; reminders simply stay.
  }
}
