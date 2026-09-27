import { describe, expect, it } from 'vitest';
import { isShareCancelled } from '../share';

describe('isShareCancelled', () => {
  it('recognises the share sheet being closed', () => {
    // The exact message @capacitor/share rejects with on Android.
    expect(isShareCancelled(new Error('Share canceled'))).toBe(true);
    expect(isShareCancelled(new Error('Share cancelled'))).toBe(true);
  });

  it('treats real failures as failures', () => {
    expect(isShareCancelled(new Error('Unable to write file'))).toBe(false);
    expect(isShareCancelled(undefined)).toBe(false);
  });
});
