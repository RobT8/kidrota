import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';
import { getSetting, setSetting } from '../db/settings';
import { todayISO } from './dates';
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
