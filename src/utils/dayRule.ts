import type { RepeatRule } from '../db/assignments';

/** Which other days a change goes to; a null rule is just the day on screen. */
export interface DayRule {
  rule: RepeatRule | null;
  /** The weekdays for 'custom'. 0 = Sunday … 6 = Saturday. */
  days: number[];
}

export const JUST_THIS_DAY: DayRule = { rule: null, days: [] };
