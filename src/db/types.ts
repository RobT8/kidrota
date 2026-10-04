import type { CarerType, HolidayMode, Period } from '../utils/constants';

/** A school holiday the user is planning cover for. */
export interface Holiday {
  id: number;
  name: string;
  /** ISO date, YYYY-MM-DD. */
  start_date: string;
  /** ISO date, YYYY-MM-DD, inclusive. */
  end_date: string;
  /**
   * Always 'detailed' (set times) since Oct 2026. Kept so older backups still
   * read; migration v3 converted every 'simple' holiday.
   */
  mode: HolidayMode;
  /** SQLite has no boolean; 0 or 1. */
  exclude_weekends: number;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: number;
  name: string;
  /** Hex colour used for the child's avatar. */
  colour: string;
  sort_order: number;
}

export interface Carer {
  id: number;
  name: string;
  /** Abbreviated form shown in the tight weekly grid cells, e.g. "Gran". */
  short_name: string;
  type: CarerType;
  cost_per_day: number | null;
  /** Pro custom colour. NULL means "derive from type", which is the default. */
  colour: string | null;
  sort_order: number;
}

/**
 * One planned block of cover.
 *
 * A carer looking after a child from `start_time` to `end_time` (HH:MM).
 * `period` ('am' | 'pm' | 'all_day') is from the retired Morning/Afternoon
 * mode: migration v3 turned those rows into times, so it is always NULL now.
 */
export interface Assignment {
  id: number;
  holiday_id: number;
  child_id: number;
  carer_id: number;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  period: Period | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  cost: number | null;
}

/** Input for creating a holiday; the DB fills id and timestamps. */
export type NewHoliday = Omit<Holiday, 'id' | 'mode' | 'created_at' | 'updated_at'>;
export type NewChild = Omit<Child, 'id'>;
export type NewCarer = Omit<Carer, 'id'>;
export type NewAssignment = Omit<Assignment, 'id'>;
