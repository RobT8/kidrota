import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from '../schema';

/**
 * Fingerprints of every migration that has shipped, in order.
 *
 * A phone that has run a migration never runs it again, so editing one after
 * release would leave existing users with a database that no longer matches
 * the app — the one way an update could damage someone's plans. This test
 * fails on any such edit. Adding a new migration to the end is always fine:
 * after releasing it, add its fingerprint here too (the failure message for a
 * new, unsealed migration prints the value to paste).
 *
 * Line endings are normalised first, so a Windows checkout gives the same
 * fingerprint as everywhere else.
 */
const SHIPPED = [
  // v1 — initial schema (KidRota 1.0.0)
  'c754e20594c2ec9171c7fd382e686dcb34d3d74b8aee6044d262bd988bf3dd68',
  // v2 (KidRota 1.0.0)
  '39ae2f97e32447d70cd7317e70a1caf700ffdc0a65f38d5ab4427dfb763712de',
  // v3 — Morning/Afternoon cover converted to set times (KidRota 1.0.1)
  'ccf0e518df73e817b655cf2c88894bbc7db5dbaae27d69988ac5265c8f7f98d2',
];

function fingerprint(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

describe('shipped migrations', () => {
  it('are all still present, in order', () => {
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(SHIPPED.length);
  });

  SHIPPED.forEach((expected, index) => {
    it(`v${index + 1} has not been edited since it shipped`, () => {
      expect(
        fingerprint(MIGRATIONS[index]),
        `Migration v${index + 1} has changed after release. Put it back and add a new migration instead.`,
      ).toBe(expected);
    });
  });

  it('lists every migration, so a new one is sealed once it ships', () => {
    const unsealed = MIGRATIONS.slice(SHIPPED.length).map(fingerprint);
    expect(
      unsealed,
      `New migration found. Add its fingerprint to SHIPPED (and update it if the migration changes before release): ${unsealed.join(', ')}`,
    ).toEqual([]);
  });
});
