import { DatabaseSync } from 'node:sqlite';
import type { DbExecutor, RunResult, SqlValue } from './executor';
import { migrate } from './migrate';

/**
 * An in-memory executor backed by Node's built-in SQLite, for tests.
 *
 * Tests run the real migrations and the real SQL — only the driver differs
 * from the device — so schema mistakes and broken queries surface here rather
 * than on a phone.
 */
export function createTestExecutor(): DbExecutor & { close: () => void } {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  let depth = 0;

  return {
    async query<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[];
    },
    async run(sql: string, params: SqlValue[] = []): Promise<RunResult> {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastId: Number(result.lastInsertRowid) };
    },
    async executeScript(sql: string): Promise<void> {
      db.exec(sql);
    },
    async persist(): Promise<void> {},
    async transaction<T>(work: () => Promise<T>): Promise<T> {
      if (depth > 0) return work();
      db.exec('BEGIN');
      depth++;
      try {
        const result = await work();
        depth--;
        db.exec('COMMIT');
        return result;
      } catch (error) {
        depth--;
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => db.close(),
  };
}

/** A migrated, empty database ready for a test to populate. */
export async function createTestDb(): Promise<DbExecutor & { close: () => void }> {
  const db = createTestExecutor();
  await migrate(db);
  return db;
}
