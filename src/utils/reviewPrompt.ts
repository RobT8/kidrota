import { daysBetween } from './dates';

/**
 * When to ask for a Play Store review.
 *
 * Google's In-App Review API decides for itself whether the card appears and
 * never says whether it did, so the app cannot tell a review left from a
 * card never shown. The rule here keeps KidRota from even asking at a bad
 * moment: never in the first few days, never twice in quick succession, and
 * only a handful of times ever. The trigger — a holiday with every day
 * covered — is the caller's; this only decides whether now is too soon.
 */

/** Days after first launch before anyone is asked. */
export const REVIEW_MIN_DAYS_INSTALLED = 3;
/** Days between one ask and the next. */
export const REVIEW_MIN_DAYS_BETWEEN = 120;
/** Asks in the app's lifetime, after which it stops for good. */
export const REVIEW_MAX_ASKS = 3;

export interface ReviewPromptState {
  /** ISO date of the first launch this rule saw. */
  firstOpened: string | null;
  /** ISO date of the most recent ask. */
  lastAsked: string | null;
  timesAsked: number;
}

export const EMPTY_REVIEW_STATE: ReviewPromptState = {
  firstOpened: null,
  lastAsked: null,
  timesAsked: 0,
};

export function shouldAskForReview(state: ReviewPromptState, today: string): boolean {
  if (!state.firstOpened) return false;
  if (daysBetween(state.firstOpened, today) < REVIEW_MIN_DAYS_INSTALLED) return false;
  if (state.timesAsked >= REVIEW_MAX_ASKS) return false;
  if (state.lastAsked && daysBetween(state.lastAsked, today) < REVIEW_MIN_DAYS_BETWEEN) return false;
  return true;
}

/** Record a launch. Only the first one counts. */
export function recordLaunch(state: ReviewPromptState, today: string): ReviewPromptState {
  return state.firstOpened ? state : { ...state, firstOpened: today };
}

export function recordAsk(state: ReviewPromptState, today: string): ReviewPromptState {
  return { ...state, lastAsked: today, timesAsked: state.timesAsked + 1 };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Read the stored state, falling back to empty for anything unreadable.
 *
 * The value lives in app_settings, which a backup restore can overwrite, so
 * it is checked field by field rather than trusted.
 */
export function parseReviewState(raw: string | null): ReviewPromptState {
  if (!raw) return EMPTY_REVIEW_STATE;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return EMPTY_REVIEW_STATE;
  }
  if (typeof value !== 'object' || value === null) return EMPTY_REVIEW_STATE;
  const { firstOpened, lastAsked, timesAsked } = value as Record<string, unknown>;
  const date = (field: unknown) =>
    typeof field === 'string' && ISO_DATE.test(field) ? field : null;
  return {
    firstOpened: date(firstOpened),
    lastAsked: date(lastAsked),
    timesAsked:
      typeof timesAsked === 'number' && Number.isInteger(timesAsked) && timesAsked >= 0
        ? timesAsked
        : 0,
  };
}
