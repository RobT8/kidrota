import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * android/app/build.gradle turns package.json's version into Google Play's
 * versionCode as major*10000 + minor*100 + patch. That only keeps rising with
 * every release while each part stays below 100 — 1.0.100 would come out the
 * same as 1.1.0 — so the version is checked here, where a mistake fails fast.
 */
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

function versionCode(v: string): number {
  const [major, minor, patch] = v.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

describe('app version', () => {
  it('is plain major.minor.patch, which the Android build can read', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('keeps every part below 100, so Play version codes cannot collide', () => {
    for (const part of version.split('.').map(Number)) expect(part).toBeLessThan(100);
  });

  it('gives Play a version code that rises with each kind of release', () => {
    expect(versionCode('1.0.0')).toBe(10000);
    expect(versionCode('1.0.1')).toBeGreaterThan(versionCode('1.0.0'));
    expect(versionCode('1.1.0')).toBeGreaterThan(versionCode('1.0.99'));
    expect(versionCode('2.0.0')).toBeGreaterThan(versionCode('1.99.99'));
  });

  it('is the same formula the Android build uses', () => {
    const gradle = readFileSync('android/app/build.gradle', 'utf8');
    expect(gradle).toContain('versionCode vMajor * 10000 + vMinor * 100 + vPatch');
    expect(gradle).toContain("parse(file('../../package.json')).version");
  });
});
