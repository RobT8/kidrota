import { describe, expect, it } from 'vitest';
import {
  canAddHoliday,
  canChangeHolidayDates,
  limitMessage,
  resolvePro,
} from '../freeTier';

describe('canAddHoliday', () => {
  it('allows one holiday on the free version', () => {
    expect(canAddHoliday(0, false)).toBe(true);
    expect(canAddHoliday(1, false)).toBe(false);
  });

  it('refuses a free user already over the cap, without taking anything away', () => {
    expect(canAddHoliday(5, false)).toBe(false);
  });

  it('has no cap with Pro', () => {
    expect(canAddHoliday(40, true)).toBe(true);
  });
});

describe('canChangeHolidayDates', () => {
  it('allows changing dates until the holiday has finished', () => {
    expect(canChangeHolidayDates('2026-10-30', '2026-10-01', false)).toBe(true);
    expect(canChangeHolidayDates('2026-10-30', '2026-10-30', false)).toBe(true);
  });

  it('freezes a finished holiday on the free version', () => {
    expect(canChangeHolidayDates('2026-10-30', '2026-10-31', false)).toBe(false);
  });

  it('never freezes with Pro', () => {
    expect(canChangeHolidayDates('2020-01-01', '2026-10-31', true)).toBe(true);
  });
});

describe('limitMessage', () => {
  it('names the one-holiday allowance', () => {
    expect(limitMessage('holidays')).toContain('one holiday');
    expect(limitMessage('holidays')).toContain('Deleting it does not make room');
  });
});

describe('resolvePro', () => {
  it('keeps the last known answer until Play has loaded purchases', () => {
    expect(resolvePro(true, false, false)).toBe(true);
    expect(resolvePro(false, false, true)).toBe(false);
  });

  it('follows Play once purchases are loaded', () => {
    expect(resolvePro(false, true, true)).toBe(true);
  });

  it('turns Pro off when the subscription has lapsed or been cancelled', () => {
    expect(resolvePro(true, true, false)).toBe(false);
  });
});
