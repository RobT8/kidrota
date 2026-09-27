import { describe, expect, it } from 'vitest';
import { MAX_HOLIDAY_DAYS } from '../constants';
import { holidayDatesProblem, holidayLength, isHexColour, isISODate } from '../validate';

describe('holidayDatesProblem', () => {
  it('accepts an ordinary half term', () => {
    expect(holidayDatesProblem('2026-10-19', '2026-10-23', true)).toBeNull();
  });

  it('accepts the longest allowed holiday, and refuses one day more', () => {
    // 20 Jul + 69 days = 27 Sep: exactly ten weeks, first and last day included.
    expect(holidayLength('2026-07-20', '2026-09-27')).toBe(MAX_HOLIDAY_DAYS);
    expect(holidayDatesProblem('2026-07-20', '2026-09-27', true)).toBeNull();
    expect(holidayDatesProblem('2026-07-20', '2026-09-28', true)).toMatch(/up to 10 weeks/);
  });

  it('refuses a whole school year, which would be every break on the free version', () => {
    expect(holidayDatesProblem('2026-09-01', '2027-08-31', true)).toMatch(/Split a longer stretch/);
  });

  it('explains dates the wrong way round and all-weekend ranges', () => {
    expect(holidayDatesProblem('2026-10-23', '2026-10-19', true)).toMatch(/before the start/);
    expect(holidayDatesProblem('2026-10-24', '2026-10-25', true)).toMatch(/all weekend/);
    expect(holidayDatesProblem('2026-10-24', '2026-10-25', false)).toBeNull();
  });
});

describe('outside-data checks', () => {
  it('only accepts real calendar days', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('26-2-3')).toBe(false);
    expect(isISODate(20260228)).toBe(false);
  });

  it('only accepts six-digit hex colours', () => {
    expect(isHexColour('#378ADD')).toBe(true);
    expect(isHexColour('#fff')).toBe(false);
    expect(isHexColour('red')).toBe(false);
    expect(isHexColour('url(x)')).toBe(false);
  });
});
