import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ProContext } from '../hooks/usePro';
import { Capacitor } from '@capacitor/core';
import { getBillingState, recheckPurchases, startBilling, subscribeBilling } from '../utils/billing';
import type { ProFeature } from '../utils/freeTier';
import ProSheet from './ProSheet';

/**
 * Holds the Pro state for the whole app and owns the one upgrade sheet, so any
 * screen that hits a free-tier limit can offer the upgrade in place.
 */
export default function ProProvider({ children }: { children: React.ReactNode }) {
  const billing = useSyncExternalStore(subscribeBilling, getBillingState);
  // Undefined inside means "opened from Settings", with no limit to explain.
  const [sheet, setSheet] = useState<{ feature?: ProFeature } | null>(null);

  useEffect(() => {
    startBilling();
  }, []);

  // Pick up changes made in the Play Store while the app was in the background.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('resume', () => {
        recheckPurchases();
      });
      if (cancelled) handle.remove();
      else remove = () => handle.remove();
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  const openUpgrade = useCallback((feature?: ProFeature) => setSheet({ feature }), []);
  const close = useCallback(() => setSheet(null), []);
  const value = useMemo(() => ({ pro: billing.pro, openUpgrade }), [billing.pro, openUpgrade]);

  return (
    <ProContext.Provider value={value}>
      {children}
      {sheet && <ProSheet billing={billing} feature={sheet.feature} onClose={close} />}
    </ProContext.Provider>
  );
}
