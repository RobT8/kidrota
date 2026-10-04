/**
 * Turns Morning/Afternoon ("simple" mode) cover into set times: AM becomes
 * 08:00–12:00, PM 12:00–18:00 and a whole day 08:00–18:00 — the same times as
 * the Morning, Afternoon and All day presets. Used by migration v3 and again
 * after restoring a backup made before it.
 */
export const CONVERT_PERIODS_TO_TIMES = [
  `UPDATE assignments
   SET start_time = CASE period WHEN 'pm' THEN '12:00' ELSE '08:00' END,
       end_time = CASE period WHEN 'am' THEN '12:00' ELSE '18:00' END,
       period = NULL
   WHERE period IS NOT NULL`,
  `UPDATE holidays SET mode = 'detailed' WHERE mode <> 'detailed'`,
];

/**
 * Schema migrations, applied in order and tracked with SQLite's `user_version`.
 *
 * Never edit a migration that has shipped — a user's device has already run it.
 * Add a new entry to the end of the array instead.
 */
export const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'simple',
    exclude_weekends INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    colour TEXT NOT NULL DEFAULT '#378ADD',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS carers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    cost_per_day REAL,
    colour TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holiday_id INTEGER NOT NULL,
    child_id INTEGER NOT NULL,
    carer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    period TEXT,
    start_time TEXT,
    end_time TEXT,
    notes TEXT,
    cost REAL,
    FOREIGN KEY (holiday_id) REFERENCES holidays(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (carer_id) REFERENCES carers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_assignments_date
    ON assignments(holiday_id, child_id, date);

  -- Simple mode allows exactly one carer per child per slot, which is what the
  -- gap detection assumes. Detailed-mode rows have period IS NULL and are
  -- excluded, so a child can have many time slots in one day.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_slot
    ON assignments(holiday_id, child_id, date, period)
    WHERE period IS NOT NULL;
  `,

  // v2 — notes that belong to a day rather than to one carer's slot.
  //
  // The assignments table has its own notes column, but a note like "pack
  // swimming kit" describes the day: storing it per assignment would duplicate
  // it across every slot and lose it entirely on a day with no cover booked.
  `
  CREATE TABLE IF NOT EXISTS day_notes (
    holiday_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    note TEXT NOT NULL,
    PRIMARY KEY (holiday_id, date),
    FOREIGN KEY (holiday_id) REFERENCES holidays(id) ON DELETE CASCADE
  );
  `,

  // v3 — one way of planning. The Morning/Afternoon mode was dropped (Oct
  // 2026): set times already offer Morning and Afternoon as one-tap choices,
  // so existing AM/PM cover is converted to those times.
  CONVERT_PERIODS_TO_TIMES.map((statement) => `${statement};`).join('\n'),
];

/** Schema version this build of the app expects. */
export const SCHEMA_VERSION = MIGRATIONS.length;
