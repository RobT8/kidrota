import { describe, expect, it } from 'vitest';
import { PRO_YEARLY_ID, isPendingPro, ownsPro } from '../billing';

describe('isPendingPro', () => {
  const pro = [{ id: PRO_YEARLY_ID }];

  it('spots a Pro purchase waiting on payment', () => {
    expect(isPendingPro([{ isPending: true, products: pro }])).toBe(true);
  });

  it('ignores a purchase that has been paid for', () => {
    expect(isPendingPro([{ isPending: false, products: pro }])).toBe(false);
    expect(isPendingPro([{ products: pro }])).toBe(false);
  });

  it('ignores pending purchases of anything else', () => {
    expect(isPendingPro([{ isPending: true, products: [{ id: 'something_else' }] }])).toBe(false);
  });

  it('is false with no purchases at all', () => {
    expect(isPendingPro([])).toBe(false);
  });
});

describe('ownsPro', () => {
  const pro = [{ id: PRO_YEARLY_ID }];
  const now = new Date('2026-11-01T19:00:00Z');
  const past = new Date('2026-11-01T11:00:00Z');
  const future = new Date('2026-11-01T19:30:00Z');

  it('owns Pro with a paid purchase', () => {
    expect(ownsPro([{ state: 'approved', products: pro }], now)).toBe(true);
    expect(ownsPro([{ state: 'finished', products: pro, expirationDate: future }], now)).toBe(true);
  });

  it('owns Pro when a lapsed purchase sits next to a new one, in either order', () => {
    const lapsed = { state: 'cancelled', products: pro, expirationDate: past };
    const fresh = { state: 'approved', products: pro };
    expect(ownsPro([lapsed, fresh], now)).toBe(true);
    expect(ownsPro([fresh, lapsed], now)).toBe(true);
  });

  it('does not own Pro with only a lapsed, cancelled or pending purchase', () => {
    expect(ownsPro([{ state: 'approved', products: pro, expirationDate: past }], now)).toBe(false);
    expect(ownsPro([{ state: 'cancelled', products: pro }], now)).toBe(false);
    expect(ownsPro([{ isPending: true, products: pro }], now)).toBe(false);
    expect(ownsPro([{ isConsumed: true, products: pro }], now)).toBe(false);
  });

  it('ignores purchases of anything else, and no purchases at all', () => {
    expect(ownsPro([{ state: 'approved', products: [{ id: 'something_else' }] }], now)).toBe(false);
    expect(ownsPro([], now)).toBe(false);
  });
});
