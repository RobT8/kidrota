import { describe, expect, it } from 'vitest';
import { connect, DB_NAME, type ConnectionManager } from '../database';

/**
 * A stand-in for the SQLite plugin that behaves like it does on Android: the
 * native side's open connections survive a WebView reload, while the
 * JavaScript side's list of them starts empty again.
 */
class FakeNative {
  open = new Set<string>();
}

function fakeManager(native: FakeNative): ConnectionManager & { created: number } {
  const known = new Map<string, { name: string }>();
  const manager = {
    created: 0,
    async checkConnectionsConsistency() {
      // Native closes whatever JavaScript no longer knows about.
      for (const name of [...native.open]) if (!known.has(name)) native.open.delete(name);
      return { result: native.open.size === known.size && native.open.size > 0 };
    },
    async isConnection(name: string) {
      return { result: known.has(name) };
    },
    async retrieveConnection(name: string) {
      return known.get(name);
    },
    async createConnection(name: string) {
      if (native.open.has(name)) throw new Error(`Connection ${name} already exists`);
      native.open.add(name);
      const conn = { name };
      known.set(name, conn);
      manager.created++;
      return conn;
    },
  };
  return manager as unknown as ConnectionManager & { created: number };
}

describe('connect', () => {
  it('creates the connection on first launch', async () => {
    const native = new FakeNative();
    const manager = fakeManager(native);
    await connect(manager);
    expect(manager.created).toBe(1);
    expect(native.open.has(DB_NAME)).toBe(true);
  });

  it('reuses the connection it already has', async () => {
    const manager = fakeManager(new FakeNative());
    const first = await connect(manager);
    expect(await connect(manager)).toBe(first);
    expect(manager.created).toBe(1);
  });

  it('survives a page reload, which restoring a backup does', async () => {
    const native = new FakeNative();
    await connect(fakeManager(native));

    // After the reload: same native side, fresh JavaScript.
    const reloaded = fakeManager(native);
    await expect(connect(reloaded)).resolves.toBeDefined();
    expect(reloaded.created).toBe(1);
  });

  it('reproduces the failure without the consistency check', async () => {
    const native = new FakeNative();
    await connect(fakeManager(native));
    const reloaded = fakeManager(native);
    await expect(reloaded.createConnection(DB_NAME, false, 'no-encryption', 1, false)).rejects.toThrow(
      'already exists',
    );
  });
});
