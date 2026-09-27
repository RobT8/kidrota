/**
 * When to show the "Finding KidRota useful?" card on the Home screen.
 *
 * Nothing can tell the app whether someone actually left a rating — neither
 * Google's review card nor the Play listing reports back — so "done" means
 * they tapped Rate. The card waits until the app has been opened a few times
 * and something has been planned, never blocks anything, and takes no for an
 * answer: each "Not now" pushes it back, and after a few it stops for good.
 *
 * This sits alongside, not instead of, the Play review card that
 * reviewPrompt.ts times for the moment a holiday is fully covered.
 */

/** The open on which the card may first appear. */
export const RATING_FIRST_OPEN = 5;
/** Opens the card stays away after "Not now". */
export const RATING_SNOOZE_OPENS = 10;
/** "Not now"s after which it never comes back. */
export const RATING_MAX_DISMISSALS = 3;
/**
 * An Android app often stays in memory, so coming back to it counts as an
 * open too — but only after a real break, not a glance at another app.
 */
export const RATING_MIN_MS_BETWEEN_OPENS = 30 * 60 * 1000;

export interface RatingCardState {
  /** Times the app has been opened. */
  opens: number;
  /** When the last open was counted, in ms since 1970. */
  lastOpenAt: number | null;
  /** The open from which the card may show. */
  showFromOpen: number;
  dismissals: number;
  /** Tapped "Rate KidRota" (here or in Settings): never show again. */
  rated: boolean;
}

export const EMPTY_RATING_STATE: RatingCardState = {
  opens: 0,
  lastOpenAt: null,
  showFromOpen: RATING_FIRST_OPEN,
  dismissals: 0,
  rated: false,
};

/** Count an open, unless the last one was only moments ago. */
export function recordOpen(state: RatingCardState, now: number): RatingCardState {
  if (state.lastOpenAt !== null && now - state.lastOpenAt < RATING_MIN_MS_BETWEEN_OPENS) {
    return state;
  }
  return { ...state, opens: state.opens + 1, lastOpenAt: now };
}

/**
 * Should the card show now? `hasPlan` is whether anything has been planned
 * yet — asking before the app has done anything for someone is asking too
 * early.
 */
export function shouldShowRatingCard(state: RatingCardState, hasPlan: boolean): boolean {
  return (
    hasPlan &&
    !state.rated &&
    state.dismissals < RATING_MAX_DISMISSALS &&
    state.opens >= state.showFromOpen
  );
}

/** "Not now": come back after a while, or not at all after the last one. */
export function dismissRatingCard(state: RatingCardState): RatingCardState {
  return {
    ...state,
    dismissals: state.dismissals + 1,
    showFromOpen: state.opens + RATING_SNOOZE_OPENS,
  };
}

export function markRated(state: RatingCardState): RatingCardState {
  return { ...state, rated: true };
}

const count = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;

/**
 * Read the stored state, falling back to empty for anything unreadable. It
 * lives in app_settings, which a backup restore can overwrite, so every field
 * is checked rather than trusted.
 */
export function parseRatingState(raw: string | null): RatingCardState {
  if (!raw) return EMPTY_RATING_STATE;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return EMPTY_RATING_STATE;
  }
  if (typeof value !== 'object' || value === null) return EMPTY_RATING_STATE;
  const { opens, lastOpenAt, showFromOpen, dismissals, rated } = value as Record<string, unknown>;
  return {
    opens: count(opens, 0),
    lastOpenAt: typeof lastOpenAt === 'number' && Number.isFinite(lastOpenAt) ? lastOpenAt : null,
    showFromOpen: count(showFromOpen, RATING_FIRST_OPEN),
    dismissals: count(dismissals, 0),
    rated: rated === true,
  };
}
