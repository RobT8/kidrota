import { describe, expect, it } from 'vitest';
import {
  EMPTY_RATING_STATE,
  RATING_MIN_MS_BETWEEN_OPENS,
  dismissRatingCard,
  markRated,
  parseRatingState,
  recordOpen,
  shouldShowRatingCard,
  type RatingCardState,
} from '../ratingCard';

const HOUR = 60 * 60 * 1000;

/** Open the app `times` times, an hour apart. */
function openTimes(state: RatingCardState, times: number): RatingCardState {
  let next = state;
  for (let i = 0; i < times; i++) next = recordOpen(next, (next.lastOpenAt ?? 0) + HOUR);
  return next;
}

describe('recordOpen', () => {
  it('counts each open', () => {
    expect(openTimes(EMPTY_RATING_STATE, 3).opens).toBe(3);
  });

  it('does not count coming straight back to the app', () => {
    const once = recordOpen(EMPTY_RATING_STATE, 1_000_000);
    expect(recordOpen(once, 1_000_000 + RATING_MIN_MS_BETWEEN_OPENS - 1).opens).toBe(1);
    expect(recordOpen(once, 1_000_000 + RATING_MIN_MS_BETWEEN_OPENS).opens).toBe(2);
  });
});

describe('shouldShowRatingCard', () => {
  it('first shows on the 5th open', () => {
    expect(shouldShowRatingCard(openTimes(EMPTY_RATING_STATE, 4), true)).toBe(false);
    expect(shouldShowRatingCard(openTimes(EMPTY_RATING_STATE, 5), true)).toBe(true);
  });

  it('waits until something has been planned', () => {
    expect(shouldShowRatingCard(openTimes(EMPTY_RATING_STATE, 20), false)).toBe(false);
  });

  it('goes for good once Rate is tapped', () => {
    const rated = markRated(openTimes(EMPTY_RATING_STATE, 5));
    expect(shouldShowRatingCard(openTimes(rated, 100), true)).toBe(false);
  });

  it('stays away for 10 opens after "Not now"', () => {
    const snoozed = dismissRatingCard(openTimes(EMPTY_RATING_STATE, 5));
    expect(shouldShowRatingCard(snoozed, true)).toBe(false);
    expect(shouldShowRatingCard(openTimes(snoozed, 9), true)).toBe(false);
    expect(shouldShowRatingCard(openTimes(snoozed, 10), true)).toBe(true);
  });

  it('never comes back after the third "Not now"', () => {
    let state = openTimes(EMPTY_RATING_STATE, 5);
    for (let i = 0; i < 3; i++) {
      expect(shouldShowRatingCard(state, true)).toBe(true);
      state = openTimes(dismissRatingCard(state), 10);
    }
    expect(shouldShowRatingCard(openTimes(state, 100), true)).toBe(false);
  });
});

describe('parseRatingState', () => {
  it('round-trips a stored state', () => {
    const state = dismissRatingCard(openTimes(EMPTY_RATING_STATE, 6));
    expect(parseRatingState(JSON.stringify(state))).toEqual(state);
  });

  it('falls back to empty for anything unreadable', () => {
    expect(parseRatingState(null)).toEqual(EMPTY_RATING_STATE);
    expect(parseRatingState('not json')).toEqual(EMPTY_RATING_STATE);
    expect(parseRatingState('[1,2]')).toEqual({ ...EMPTY_RATING_STATE });
    expect(parseRatingState('{"opens":-4,"rated":"yes","dismissals":1.5}')).toEqual(EMPTY_RATING_STATE);
  });
});
