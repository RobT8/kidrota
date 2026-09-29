import { useEffect, useState } from 'react';
import { getDb } from '../db/database';
import { isOnboardingComplete } from '../db/settings';
import { Capacitor } from '@capacitor/core';
import { noteLaunchForReview, noteOpenForRating } from '../utils/review';
import { countsAsReturn } from '../utils/ratingCard';

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

  // Android usually keeps the app in memory, so reopening it brings it back
  // rather than starting it again. Coming back after a real break counts as
  // an open; a quick hop to another app and back does not.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !state.ready) return;
    const removers: (() => void)[] = [];
    let cancelled = false;
    let wentAwayAt: number | null = null;
    (async () => {
      const { App } = await import('@capacitor/app');
      const handles = await Promise.all([
        App.addListener('pause', () => {
          wentAwayAt = Date.now();
        }),
        App.addListener('resume', () => {
          if (wentAwayAt !== null && countsAsReturn(Date.now() - wentAwayAt)) {
            noteOpenForRating().catch(() => {});
          }
          wentAwayAt = null;
        }),
      ]);
      for (const handle of handles) {
        if (cancelled) handle.remove();
        else removers.push(() => handle.remove());
      }
    })();
    return () => {
      cancelled = true;
      removers.forEach((remove) => remove());
    };
  }, [state.ready]);

  return state;
}
