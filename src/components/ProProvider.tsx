import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ProContext } from '../hooks/usePro';
import { getBillingState, startBilling, subscribeBilling } from '../utils/billing';
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
