import { Capacitor } from '@capacitor/core';
import { resolvePro } from './freeTier';

/**
 * Google Play Billing, through capacitor-plugin-cdv-purchase.
 *
 * Purchases are checked on the phone against what Play reports, with no
 * receipt server: KidRota has no backend, and adding one only for this would
 * break the promise that nothing leaves the device. The trade-off is that a
 * determined user could patch the check out of the APK; for a £1.99 a year
 * planner that is an acceptable cost.
 *
 * Pro is one product: a yearly subscription that Google Play renews
 * automatically until the user cancels it in Play. Its ID must match the one
 * created in the Play Console exactly. The price comes from Play, in the
 * buyer's own currency, never from this file.
 */
export const PRO_YEARLY_ID = 'kidrota_pro_yearly';

export interface BillingState {
  pro: boolean;
  /** Play is connected and can take a purchase. */
  available: boolean;
  /** Localised yearly price from Play, e.g. "£1.99". Null until loaded. */
  price: string | null;
}

export type PurchaseOutcome =
  | { kind: 'done' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string };

export type RestoreOutcome =
  | { kind: 'restored' }
  | { kind: 'none' }
  | { kind: 'failed'; message: string };

// Deliberately browser storage, not the app_settings table: settings travel
// inside backup files, and a backup must not be able to carry Pro to a phone
// whose Google account never bought it.
const CACHE_KEY = 'kidrota.pro';

function readCache(): boolean {
  try {
    return localStorage.getItem(CACHE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCache(pro: boolean): void {
  try {
    if (pro) localStorage.setItem(CACHE_KEY, '1');
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Only costs a moment on the free version at the next launch.
  }
}

let state: BillingState = {
  pro: readCache(),
  available: false,
  price: null,
};

const listeners = new Set<() => void>();

/** For useSyncExternalStore. */
export function subscribeBilling(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBillingState(): BillingState {
  return state;
}

function update(patch: Partial<BillingState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

type Cdv = typeof import('capacitor-plugin-cdv-purchase');
let cdv: Cdv | null = null;
let starting: Promise<void> | null = null;
let purchasesLoaded = false;

/**
 * Connect to Play once, at launch. Safe to call repeatedly.
 *
 * In a browser there is no Play to connect to: the Pro state stays whatever
 * this browser last had, which is also how the upgrade flow is exercised in
 * development.
 */
export function startBilling(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  starting ??= connect().catch(() => {
    // Leave the cached answer in place; Play being unreachable must not
    // lock a paying user out.
    starting = null;
  });
  return starting;
}

async function connect(): Promise<void> {
  const lib = await import('capacitor-plugin-cdv-purchase');
  const { store, ProductType, Platform, LogLevel } = lib;
  cdv = lib;
  store.verbosity = LogLevel.WARNING;

  store.register([
    { id: PRO_YEARLY_ID, type: ProductType.PAID_SUBSCRIPTION, platform: Platform.GOOGLE_PLAY },
  ]);

  store
    .when()
    // No receipt server, so an approved purchase is finished straight away.
    // Finishing is what acknowledges it to Play, which otherwise refunds the
    // buyer automatically after three days.
    .approved((transaction) => transaction.finish())
    .finished(refresh)
    .productUpdated(refresh)
    .receiptUpdated(refresh)
    .receiptsReady(() => {
      purchasesLoaded = true;
      refresh();
    });

  const errors = await store.initialize([Platform.GOOGLE_PLAY]);
  update({ available: errors.length === 0 });
  refresh();
}

function refresh(): void {
  if (!cdv) return;
  const { store, Platform } = cdv;
  const subscribed = store.owned({ id: PRO_YEARLY_ID, platform: Platform.GOOGLE_PLAY });
  const pro = resolvePro(state.pro, purchasesLoaded, subscribed);
  if (purchasesLoaded) writeCache(pro);

  update({
    pro,
    price: store.get(PRO_YEARLY_ID, Platform.GOOGLE_PLAY)?.pricing?.price ?? null,
  });
}

/**
 * Open Play's purchase sheet. Pro unlocks through the store events above once
 * Play approves, not from this return value — a payment can also complete
 * later, for instance a cash payment at a shop.
 */
export async function buyPro(): Promise<PurchaseOutcome> {
  if (!cdv) return { kind: 'failed', message: 'Purchases only work in the app installed from Google Play.' };
  const { store, Platform, ErrorCode } = cdv;
  const offer = store.get(PRO_YEARLY_ID, Platform.GOOGLE_PLAY)?.getOffer();
  if (!offer) {
    return { kind: 'failed', message: 'Google Play has not loaded this option yet. Check your connection and try again.' };
  }
  const error = await offer.order();
  if (!error) return { kind: 'done' };
  if (error.code === ErrorCode.PAYMENT_CANCELLED) return { kind: 'cancelled' };
  return { kind: 'failed', message: error.message };
}

/** Ask Play again for everything this Google account has bought. */
export async function restorePro(): Promise<RestoreOutcome> {
  if (!cdv) return { kind: 'failed', message: 'Purchases only work in the app installed from Google Play.' };
  const error = await cdv.store.restorePurchases();
  if (error) return { kind: 'failed', message: error.message };
  purchasesLoaded = true;
  refresh();
  return state.pro ? { kind: 'restored' } : { kind: 'none' };
}

/** Play's own page for managing or cancelling the subscription. */
export const MANAGE_SUBSCRIPTION_URL = `https://play.google.com/store/account/subscriptions?sku=${PRO_YEARLY_ID}&package=com.kidrota.app`;
