import { analytics } from "@/lib/analytics";
import { isNative, safeNative } from "@/lib/native/platform";
import { STORAGE_KEYS, storage } from "@/lib/native/storage";

export const REVENUECAT_ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY ?? "";
export const ENTITLEMENT_ID = "pro";

export type EntitlementState = {
  isPremium: boolean;
  willRenew: boolean;
  expiresAt: string | null;
  checkedAt: string;
};

const DEFAULT_STATE: EntitlementState = {
  isPremium: false,
  willRenew: false,
  expiresAt: null,
  checkedAt: new Date(0).toISOString(),
};

let configured = false;

/**
 * The RevenueCat plugin registers itself against browser globals on import,
 * so it is only loaded lazily inside native code paths (never during SSR).
 */
async function rc() {
  return import("@revenuecat/purchases-capacitor");
}

/** Reads the locally cached entitlement so premium keeps working offline. */
export async function getCachedEntitlement(): Promise<EntitlementState> {
  return storage.get<EntitlementState>(STORAGE_KEYS.entitlement, DEFAULT_STATE);
}

async function cacheEntitlement(state: EntitlementState): Promise<EntitlementState> {
  await storage.set(STORAGE_KEYS.entitlement, state);
  return state;
}

export async function configureRevenueCat(appUserId?: string): Promise<void> {
  if (!isNative() || configured) return;
  await safeNative(async () => {
    const { Purchases, LOG_LEVEL } = await rc();
    await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR });
    await Purchases.configure(
      appUserId
        ? { apiKey: REVENUECAT_ANDROID_KEY, appUserID: appUserId }
        : { apiKey: REVENUECAT_ANDROID_KEY },
    );
    configured = true;
  });
}

export async function identifyUser(appUserId: string): Promise<void> {
  if (!isNative()) return;
  await safeNative(async () => {
    await configureRevenueCat(appUserId);
    const { Purchases } = await rc();
    await Purchases.logIn({ appUserID: appUserId });
  });
}

export async function logOutRevenueCat(): Promise<void> {
  await safeNative(async () => {
    const { Purchases } = await rc();
    await Purchases.logOut();
  });
  await cacheEntitlement(DEFAULT_STATE);
}

function toState(info: { entitlements: { active: Record<string, unknown> } }): EntitlementState {
  const active = info.entitlements.active[ENTITLEMENT_ID] as
    | { willRenew?: boolean; expirationDate?: string | null }
    | undefined;
  return {
    isPremium: Boolean(active),
    willRenew: Boolean(active?.willRenew),
    expiresAt: active?.expirationDate ?? null,
    checkedAt: new Date().toISOString(),
  };
}

/** Refreshes entitlement from RevenueCat; falls back to cache on any failure. */
export async function refreshEntitlement(): Promise<EntitlementState> {
  if (!isNative()) return getCachedEntitlement();
  try {
    await configureRevenueCat();
    const { Purchases } = await rc();
    const { customerInfo } = await Purchases.getCustomerInfo();
    return cacheEntitlement(toState(customerInfo));
  } catch (error) {
    analytics.error(error, { stage: "revenuecat_refresh" });
    return getCachedEntitlement();
  }
}

export type PurchaseOutcome =
  | { status: "success"; state: EntitlementState }
  | { status: "cancelled" }
  | { status: "pending" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

/** Presents RevenueCat's native paywall and normalises every outcome. */
export async function presentPaywall(): Promise<PurchaseOutcome> {
  if (!isNative()) return { status: "unavailable" };
  try {
    await configureRevenueCat();
    const { Purchases } = await rc();
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages?.[0];
    if (!pkg) return { status: "unavailable" };

    const result = await Purchases.purchasePackage({ aPackage: pkg });
    const state = await cacheEntitlement(toState(result.customerInfo));
    if (!state.isPremium) return { status: "pending" };
    analytics.track("purchase_success");
    return { status: "success", state };
  } catch (error) {
    const err = error as { code?: string; message?: string; userCancelled?: boolean };
    if (err.userCancelled || /cancel/i.test(err.message ?? "")) {
      analytics.track("purchase_cancelled");
      return { status: "cancelled" };
    }
    if (/pending|deferred/i.test(err.message ?? "")) return { status: "pending" };
    analytics.error(error, { stage: "revenuecat_purchase" });
    return { status: "error", message: err.message ?? "Purchase failed" };
  }
}

export async function restorePurchases(): Promise<PurchaseOutcome> {
  if (!isNative()) return { status: "unavailable" };
  try {
    await configureRevenueCat();
    const { Purchases } = await rc();
    const { customerInfo } = await Purchases.restorePurchases();
    const state = await cacheEntitlement(toState(customerInfo));
    return { status: "success", state };
  } catch (error) {
    analytics.error(error, { stage: "revenuecat_restore" });
    return { status: "error", message: (error as Error).message };
  }
}