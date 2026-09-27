/** Values SQLite can bind to a placeholder. */
export type SqlValue = string | number | null;

export interface RunResult {
  changes: number;
  /** Row id of the inserted row; only meaningful after an INSERT. */
  lastId: number;
}

/**
 * The narrow slice of SQLite the app actually needs.
 *
 * Everything above this interface is plain SQL, so the same CRUD code runs
 * against the Capacitor plugin (Android and browser) and against node:sqlite
 * in tests.
 */
export interface DbExecutor {
  query<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  run(sql: string, params?: SqlValue[]): Promise<RunResult>;
  /** Run a multi-statement script (migrations). */
  executeScript(sql: string): Promise<void>;
  /** Flush to durable storage. No-op where writes are already durable. */
  persist(): Promise<void>;
  /**
   * Run `work` as one transaction: every write lands, or — if anything throws
   * — none of them do. A call made inside another transaction simply joins it.
   */
  transaction<T>(work: () => Promise<T>): Promise<T>;
}
