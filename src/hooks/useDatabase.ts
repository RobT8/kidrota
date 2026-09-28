import { useEffect, useState } from 'react';
import { getDb } from '../db/database';
import { isOnboardingComplete } from '../db/settings';
import { Capacitor } from '@capacitor/core';
import { noteLaunchForReview, noteOpenForRating } from '../utils/review';

export interface DatabaseState {
  ready: boolean;
  /** Null until the database is open; decides the launch route. */
  onboarded: boolean | null;
  error: Error | null;
}

/**
 * Open the database and run migrations once, on app start.
 *
 * Everything else in the app assumes the schema exists, so nothing renders
 * until this resolves.
 */
export function useDatabase(): DatabaseState {
  const [state, setState] = useState<DatabaseState>({
    ready: false,
    onboarded: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await getDb();
        const onboarded = await isOnboardingComplete();
        // Bookkeeping for the review prompt; never worth failing launch over.
        noteLaunchForReview().catch(() => {});
        // Awaited so Home already knows about this open when it first draws.
        await noteOpenForRating().catch(() => {});
        if (!cancelled) setState({ ready: true, onboarded, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({ ready: false, onboarded: null, error: error as Error });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Coming back to an app still in memory is an open too; recordOpen ignores
  // such returns within half an hour, so switching apps briefly does not
  // count. (A fresh start, above, always counts.)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !state.ready) return;
    let remove: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('resume', () => {
        noteOpenForRating(true).catch(() => {});
      });
      if (cancelled) handle.remove();
      else remove = () => handle.remove();
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [state.ready]);

  return state;
}
