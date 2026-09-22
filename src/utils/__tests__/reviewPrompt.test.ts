import { describe, expect, it } from 'vitest';
import {
  EMPTY_REVIEW_STATE,
  REVIEW_MAX_ASKS,
  parseReviewState,
  recordAsk,
  recordLaunch,
  shouldAskForReview,
  type ReviewPromptState,
} from '../reviewPrompt';

const state = (over: Partial<ReviewPromptState>): ReviewPromptState => ({
  ...EMPTY_REVIEW_STATE,
  ...over,
});

describe('shouldAskForReview', () => {
  it('never asks before a first launch has been recorded', () => {
    expect(shouldAskForReview(EMPTY_REVIEW_STATE, '2026-10-01')).toBe(false);
  });

  it('waits three days after the first launch', () => {
    const fresh = state({ firstOpened: '2026-10-01' });
    expect(shouldAskForReview(fresh, '2026-10-03')).toBe(false);
    expect(shouldAskForReview(fresh, '2026-10-04')).toBe(true);
  });

  it('leaves 120 days between asks', () => {
    const asked = state({ firstOpened: '2026-01-01', lastAsked: '2026-03-01', timesAsked: 1 });
    expect(shouldAskForReview(asked, '2026-06-28')).toBe(false);
    expect(shouldAskForReview(asked, '2026-06-29')).toBe(true);
  });

  it('stops for good after the last allowed ask', () => {
    const spent = state({ firstOpened: '2020-01-01', lastAsked: '2020-06-01', timesAsked: REVIEW_MAX_ASKS });
    expect(shouldAskForReview(spent, '2026-10-01')).toBe(false);
  });
});

describe('recordLaunch', () => {
  it('keeps the first launch date', () => {
    const first = recordLaunch(EMPTY_REVIEW_STATE, '2026-10-01');
    expect(recordLaunch(first, '2026-11-01').firstOpened).toBe('2026-10-01');
  });
});

describe('recordAsk', () => {
  it('stamps the date and counts the ask', () => {
    const asked = recordAsk(state({ firstOpened: '2026-10-01', timesAsked: 1 }), '2026-10-10');
    expect(asked).toEqual({ firstOpened: '2026-10-01', lastAsked: '2026-10-10', timesAsked: 2 });
  });
});

describe('parseReviewState', () => {
  it('round-trips what was stored', () => {
    const saved = { firstOpened: '2026-10-01', lastAsked: '2026-10-10', timesAsked: 1 };
    expect(parseReviewState(JSON.stringify(saved))).toEqual(saved);
  });

  it('treats missing or corrupt values as empty', () => {
    expect(parseReviewState(null)).toEqual(EMPTY_REVIEW_STATE);
    expect(parseReviewState('not json')).toEqual(EMPTY_REVIEW_STATE);
    expect(parseReviewState('42')).toEqual(EMPTY_REVIEW_STATE);
  });

  it('drops fields that are the wrong shape', () => {
    const raw = JSON.stringify({ firstOpened: 'yesterday', lastAsked: 7, timesAsked: -1 });
    expect(parseReviewState(raw)).toEqual(EMPTY_REVIEW_STATE);
  });
});
