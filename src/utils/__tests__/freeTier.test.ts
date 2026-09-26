import { describe, expect, it } from 'vitest';
import {
  canAddChild,
  canAddHoliday,
  canChangeHolidayDates,
  importBlockedBy,
  limitMessage,
  nameKey,
  resolvePro,
} from '../freeTier';

describe('canAddChild / canAddHoliday', () => {
  it('allows one child and one holiday on the free version', () => {
    expect(canAddChild(0, false)).toBe(true);
    expect(canAddChild(1, false)).toBe(false);
    expect(canAddHoliday(0, false)).toBe(true);
    expect(canAddHoliday(1, false)).toBe(false);
  });

  it('refuses a free user already over the cap, without taking anything away', () => {
    expect(canAddChild(5, false)).toBe(false);
    expect(canAddHoliday(5, false)).toBe(false);
  });

  it('has no cap with Pro', () => {
    expect(canAddChild(40, true)).toBe(true);
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

describe('nameKey', () => {
  it('ignores case and surrounding spaces', () => {
    expect(nameKey('  Grandma ')).toBe(nameKey('grandma'));
  });
});

describe('importBlockedBy', () => {
  it('lets a plan about the same child in', () => {
    expect(importBlockedBy(['Ada'], ['ada '], 0, false)).toBeNull();
  });

  it('refuses a plan that would add a second child', () => {
    expect(importBlockedBy(['Ada'], ['Ada', 'Ben'], 0, false)).toBe('children');
  });

  it('counts the same new name only once', () => {
    expect(importBlockedBy([], ['Ben', 'ben'], 0, false)).toBeNull();
  });

  it('refuses once the free holiday has been used, even if deleted since', () => {
    expect(importBlockedBy(['Ada'], ['Ada'], 1, false)).toBe('holidays');
  });

  it('lets an over-cap user import a plan that adds no children', () => {
    expect(importBlockedBy(['Ada', 'Ben', 'Cleo'], ['Ada'], 0, false)).toBeNull();
  });

  it('never blocks with Pro', () => {
    expect(importBlockedBy([], ['A', 'B', 'C', 'D'], 9, true)).toBeNull();
  });
});

describe('limitMessage', () => {
  it('names the one-child and one-holiday allowance', () => {
    expect(limitMessage('children')).toContain('one child');
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
