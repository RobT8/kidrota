import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDER_DAYS, parseReminderDays } from '../notifications';

describe('parseReminderDays', () => {
  it('uses the default when nothing is saved', () => {
    // The bug this guards: Number(null) is 0, which looked like a real choice.
    expect(parseReminderDays(null)).toBe(DEFAULT_REMINDER_DAYS);
    expect(parseReminderDays('')).toBe(DEFAULT_REMINDER_DAYS);
  });

  it('keeps a saved choice, including Off', () => {
    expect(parseReminderDays('0')).toBe(0);
    expect(parseReminderDays('7')).toBe(7);
    expect(parseReminderDays('14')).toBe(14);
  });

  it('falls back to the default for anything unusable', () => {
    expect(parseReminderDays('soon')).toBe(DEFAULT_REMINDER_DAYS);
    expect(parseReminderDays('-3')).toBe(DEFAULT_REMINDER_DAYS);
    expect(parseReminderDays('2.5')).toBe(DEFAULT_REMINDER_DAYS);
  });

  it('starts with reminders off', () => {
    expect(DEFAULT_REMINDER_DAYS).toBe(0);
  });
});
