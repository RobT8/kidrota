import { describe, expect, it } from 'vitest';
import { PRO_YEARLY_ID, isPendingPro } from '../billing';

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
