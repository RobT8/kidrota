/**
 * Time rules for detailed-mode days, where a child's day is a run of sessions
 * with different carers — Dad 08:00–10:00, Gran 10:00–15:00, Mum 15:00–18:00.
 *
 * Times are "HH:MM" strings, which compare correctly as plain strings.
 */

/** The planned day. "All day" and "Rest of day" run to DAY_END. */
export const DAY_START = '08:00';
export const DAY_END = '18:00';

export interface TimeRange {
  start_time: string | null;
  end_time: string | null;
}

/** A one-tap time offered when adding a session. */
export interface TimeChoice {
  key: string;
  label: string;
  start: string;
  end: string;
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTime(value: string | null | undefined): value is string {
  return typeof value === 'string' && HH_MM.test(value);
}

/** A usable session: both times real, and ending after it starts. */
export function isValidRange(start: string, end: string): boolean {
  return isTime(start) && isTime(end) && end > start;
}

/** When the day's last session ends, or null if nothing is booked yet. */
export function latestEnd(slots: TimeRange[]): string | null {
  let latest: string | null = null;
  for (const slot of slots) {
    if (isTime(slot.end_time) && (latest === null || slot.end_time > latest)) latest = slot.end_time;
  }
  return latest;
}

/**
 * The one-tap times to offer for the next session.
 *
 * On an empty day that is the whole day or either half of it. Once something
 * is booked, the next session most likely starts where the last one ended —
 * a hand-over — so every choice starts there and only the end differs.
 */
export function timeChoices(slots: TimeRange[]): TimeChoice[] {
  const from = latestEnd(slots);
  if (from === null) {
    return [
      { key: 'morning', label: 'Morning', start: DAY_START, end: '12:00' },
      { key: 'afternoon', label: 'Afternoon', start: '12:00', end: DAY_END },
      { key: 'all-day', label: 'All day', start: DAY_START, end: DAY_END },
    ];
  }

  // A hole left earlier in the day, e.g. between Gran ending at 15:00 and Mum
  // starting at 15:30, is the likeliest thing still to fill.
  const choices: TimeChoice[] = dayGaps(slots)
    .filter((gap) => gap.end <= from)
    .map((gap) => ({ key: `gap-${gap.start}`, label: 'Fill gap', start: gap.start, end: gap.end }));

  for (const until of ['12:00', '15:00']) {
    if (until > from) choices.push({ key: `until-${until}`, label: `Until ${until}`, start: from, end: until });
  }
  if (from < DAY_END) {
    choices.push({ key: 'rest-of-day', label: 'Rest of day', start: from, end: DAY_END });
  }
  return choices;
}

/**
 * The stretches of the day (DAY_START–DAY_END) that no session covers.
 *
 * Sessions are merged first, so overlapping ones and hand-overs (one ending
 * as the next begins) leave no gap; anything before DAY_START or after
 * DAY_END is ignored.
 */
export function dayGaps(slots: TimeRange[]): { start: string; end: string }[] {
  const ranges = slots
    .filter((slot): slot is { start_time: string; end_time: string } =>
      isValidRange(slot.start_time ?? '', slot.end_time ?? ''),
    )
    .map((slot) => ({
      start: slot.start_time < DAY_START ? DAY_START : slot.start_time,
      end: slot.end_time > DAY_END ? DAY_END : slot.end_time,
    }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start.localeCompare(b.start));

  const gaps: { start: string; end: string }[] = [];
  let cursor = DAY_START;
  for (const range of ranges) {
    if (range.start > cursor) gaps.push({ start: cursor, end: range.start });
    if (range.end > cursor) cursor = range.end;
  }
  if (cursor < DAY_END) gaps.push({ start: cursor, end: DAY_END });
  return gaps;
}

/** Is every minute of the day, DAY_START to DAY_END, looked after? */
export function coversWholeDay(slots: TimeRange[]): boolean {
  return dayGaps(slots).length === 0;
}

/**
 * Where a typed-in session should start by default: the day's first gap, which
 * on a day of hand-overs is simply after the last session.
 */
export function defaultRange(slots: TimeRange[]): { start: string; end: string } {
  const [first] = dayGaps(slots);
  if (first) return first;
  const from = latestEnd(slots) ?? DAY_START;
  return { start: from, end: '' };
}

/**
 * Sessions that clash with start–end. Touching end to start is a hand-over,
 * not a clash: Dad until 10:00 and Gran from 10:00 do not overlap.
 */
export function overlapping<T extends TimeRange>(slots: T[], start: string, end: string): T[] {
  if (!isValidRange(start, end)) return [];
  return slots.filter(
    (slot) =>
      isTime(slot.start_time) &&
      isTime(slot.end_time) &&
      slot.start_time < end &&
      start < slot.end_time,
  );
}

/** "08:00–10:00" */
export function formatRange(start: string | null, end: string | null): string {
  return `${start ?? '?'}–${end ?? '?'}`;
}

export type TimelineEntry<T> =
  | { kind: 'session'; slot: T; start: string }
  | { kind: 'gap'; start: string; end: string };

/**
 * A day's sessions with its gaps slotted in between, in time order — what the
 * week grid and list show, so a hole reads as a red "?" where it falls.
 */
export function dayTimeline<T extends TimeRange>(slots: T[]): TimelineEntry<T>[] {
  const entries: TimelineEntry<T>[] = [
    ...slots.map((slot) => ({ kind: 'session' as const, slot, start: slot.start_time ?? '' })),
    ...dayGaps(slots).map((gap) => ({ kind: 'gap' as const, ...gap })),
  ];
  return entries.sort((a, b) => a.start.localeCompare(b.start) || (a.kind === 'gap' ? -1 : 1));
}
