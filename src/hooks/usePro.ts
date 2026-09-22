import { createContext, useContext } from 'react';
import type { ProFeature } from '../utils/freeTier';

export interface ProContextValue {
  pro: boolean;
  /** Open the upgrade sheet, optionally saying which limit was hit. */
  openUpgrade: (feature?: ProFeature) => void;
}

export const ProContext = createContext<ProContextValue>({
  pro: false,
  openUpgrade: () => {},
});

/** Whether Pro is unlocked, and a way to offer it at a limit. */
export function usePro(): ProContextValue {
  return useContext(ProContext);
}
