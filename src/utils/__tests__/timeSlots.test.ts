import { describe, expect, it } from 'vitest';
import {
  DAY_END,
  DAY_START,
  defaultRange,
  formatRange,
  isValidRange,
  latestEnd,
  overlapping,
  timeChoices,
} from '../timeSlots';

const slot = (start_time: string, end_time: string) => ({ start_time, end_time });

describe('timeChoices', () => {
  it('offers the whole day and its two halves on an empty day', () => {
    const choices = timeChoices([]);
    expect(choices.map((c) => [c.label, c.start, c.end])).toEqual([
      ['Morning', DAY_START, '12:00'],
      ['Afternoon', '12:00', DAY_END],
      ['All day', DAY_START, DAY_END],
    ]);
  });

  it('has the two halves meet, so booking both leaves no gap', () => {
    const [morning, afternoon] = timeChoices([]);
    expect(morning.end).toBe(afternoon.start);
  });

  it('starts every choice where the last session ended', () => {
    const choices = timeChoices([slot('08:00', '10:00')]);
    expect(choices.map((c) => [c.label, c.start, c.end])).toEqual([
      ['Until 12:00', '10:00', '12:00'],
      ['Until 15:00', '10:00', '15:00'],
      ['Rest of day', '10:00', DAY_END],
    ]);
  });

  it('builds the Dad, Gran, Mum day in three steps', () => {
    const day = [slot('08:00', '10:00'), slot('10:00', '15:00')];
    const choices = timeChoices(day);
    expect(choices.map((c) => c.label)).toEqual(['Rest of day']);
    expect(choices[0]).toMatchObject({ start: '15:00', end: '18:00' });
  });

  it('offers nothing one-tap once the day is booked to its end', () => {
    expect(timeChoices([slot('08:00', '18:00')])).toEqual([]);
  });

  it('follows the latest end, not the last one added', () => {
    const choices = timeChoices([slot('13:00', '16:00'), slot('08:00', '10:00')]);
    expect(choices[0].start).toBe('16:00');
  });
});

describe('defaultRange', () => {
  it('fills the whole day when nothing is booked', () => {
    expect(defaultRange([])).toEqual({ start: DAY_START, end: DAY_END });
  });

  it('starts at the hand-over from the last session', () => {
    expect(defaultRange([slot('08:00', '10:00')])).toEqual({ start: '10:00', end: DAY_END });
  });

  it('leaves the end blank when the day is already booked to its end', () => {
    expect(defaultRange([slot('08:00', '18:00')])).toEqual({ start: '18:00', end: '' });
  });
});

describe('overlapping', () => {
  const day = [slot('08:00', '10:00'), slot('10:00', '15:00')];

  it('treats a hand-over as no clash', () => {
    expect(overlapping(day, '15:00', '18:00')).toEqual([]);
  });

  it('finds the sessions a new one runs into', () => {
    expect(overlapping(day, '09:00', '11:00')).toEqual(day);
    expect(overlapping(day, '14:00', '16:00')).toEqual([day[1]]);
  });

  it('ignores an invalid range', () => {
    expect(overlapping(day, '11:00', '09:00')).toEqual([]);
  });
});

describe('isValidRange', () => {
  it('needs two real times with the end after the start', () => {
    expect(isValidRange('08:00', '10:00')).toBe(true);
    expect(isValidRange('10:00', '10:00')).toBe(false);
    expect(isValidRange('10:00', '08:00')).toBe(false);
    expect(isValidRange('8am', '10:00')).toBe(false);
    expect(isValidRange('08:00', '')).toBe(false);
  });
});

describe('latestEnd / formatRange', () => {
  it('finds the latest end among sessions', () => {
    expect(latestEnd([])).toBeNull();
    expect(latestEnd([slot('08:00', '10:00'), slot('13:00', '17:30')])).toBe('17:30');
  });

  it('formats a range compactly', () => {
    expect(formatRange('08:00', '10:00')).toBe('08:00–10:00');
  });
});
