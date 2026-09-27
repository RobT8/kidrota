import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';
import { getSetting, setSetting } from '../db/settings';
import { PLAY_STORE_URL } from './constants';
import { todayISO } from './dates';
import {
  dismissRatingCard,
  markRated,
  parseRatingState,
  recordOpen,
  type RatingCardState,
} from './ratingCard';
import {
  parseReviewState,
  recordAsk,
  recordLaunch,
  shouldAskForReview,
  type ReviewPromptState,
} from './reviewPrompt';

const REVIEW_STATE_KEY = 'review_prompt';

async function loadState(): Promise<ReviewPromptState> {
  return parseReviewState(await getSetting(REVIEW_STATE_KEY));
}

async function saveState(state: ReviewPromptState): Promise<void> {
  await setSetting(REVIEW_STATE_KEY, JSON.stringify(state));
}

/** Note the first launch, which starts the "installed for a few days" clock. */
export async function noteLaunchForReview(): Promise<void> {
  const state = await loadState();
  if (!state.firstOpened) await saveState(recordLaunch(state, todayISO()));
}

/**
 * Ask for a Play Store review if the timing rule allows it.
 *
 * Only the installed app can ask; the browser build does nothing. Play shows
 * the card at most once per its own quota, never for an app not installed
 * from Play, and never reports what happened — so a failure is swallowed and
 * the ask is counted either way, rather than retried on every visit.
 */
export async function maybeAskForReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const state = await loadState();
  const today = todayISO();
  if (!shouldAskForReview(state, today)) return;

  await saveState(recordAsk(state, today));
  try {
    await InAppReview.requestReview();
  } catch {
    // Nothing useful to tell the user: Play decides whether a card appears.
  }
}

const RATING_CARD_KEY = 'rating_card';

export async function loadRatingState(): Promise<RatingCardState> {
  return parseRatingState(await getSetting(RATING_CARD_KEY));
}

async function saveRatingState(state: RatingCardState): Promise<void> {
  await setSetting(RATING_CARD_KEY, JSON.stringify(state));
}

/** Count an open of the app for the Home rating card. */
export async function noteOpenForRating(): Promise<void> {
  const state = await loadRatingState();
  const next = recordOpen(state, Date.now());
  if (next !== state) await saveRatingState(next);
}

/** "Not now" on the Home rating card. */
export async function snoozeRatingCard(): Promise<void> {
  await saveRatingState(dismissRatingCard(await loadRatingState()));
}

/**
 * Open the Play listing to rate the app, and retire the Home card — used by
 * both the card and Settings → "Rate this app". The listing never says
 * whether a rating was left, so tapping Rate is the closest thing to done.
 */
export async function rateOnPlay(): Promise<void> {
  window.open(PLAY_STORE_URL, '_blank', 'noopener');
  await saveRatingState(markRated(await loadRatingState()));
}
