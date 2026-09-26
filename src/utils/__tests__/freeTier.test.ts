import { describe, expect, it } from 'vitest';
import {
  canAddChild,
  canAddHoliday,
  importBlockedBy,
  limitMessage,
  nameKey,
  resolvePro,
} from '../freeTier';

describe('canAddChild / canAddHoliday', () => {
  it('allows up to two of each on the free version', () => {
    expect(canAddChild(1, false)).toBe(true);
    expect(canAddChild(2, false)).toBe(false);
    expect(canAddHoliday(1, false)).toBe(true);
    expect(canAddHoliday(2, false)).toBe(false);
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

describe('nameKey', () => {
  it('ignores case and surrounding spaces', () => {
    expect(nameKey('  Grandma ')).toBe(nameKey('grandma'));
  });
});

describe('importBlockedBy', () => {
  it('lets a plan about the same children in', () => {
    expect(importBlockedBy(['Ada', 'Ben'], ['ada ', 'BEN'], 1, false)).toBeNull();
  });

  it('refuses a plan that would add a third child', () => {
    expect(importBlockedBy(['Ada', 'Ben'], ['Ada', 'Cleo'], 1, false)).toBe('children');
  });

  it('counts the same new name only once', () => {
    expect(importBlockedBy(['Ada'], ['Ben', 'ben'], 0, false)).toBeNull();
  });

  it('refuses when the holiday cap is already reached', () => {
    expect(importBlockedBy(['Ada'], ['Ada'], 2, false)).toBe('holidays');
  });

  it('lets an over-cap user import a plan that adds no children', () => {
    expect(importBlockedBy(['Ada', 'Ben', 'Cleo'], ['Ada'], 0, false)).toBeNull();
  });

  it('never blocks with Pro', () => {
    expect(importBlockedBy([], ['A', 'B', 'C', 'D'], 9, true)).toBeNull();
  });
});

describe('limitMessage', () => {
  it('names the cap in the message', () => {
    expect(limitMessage('children')).toContain('2 children');
    expect(limitMessage('holidays')).toContain('2 holidays');
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
