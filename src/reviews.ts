import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { getOffering } from './purchases';
import { todayIso } from './db';

/**
 * App Store rating asks, at moments of value. Each trigger fires at most once
 * ever, at most one prompt per launch, and StoreKit still decides whether the
 * prompt is actually shown (it caps it at 3 a year).
 *   rollcall  - first finished roll call
 *   export    - first report export (PDF or CSV)
 *   purchase  - right after a trial or purchase from the onboarding paywall
 *   laterDay  - first launch on a later calendar day than install
 * Never while the Lifetime launch offer is free (Free mode).
 */
export type ReviewTrigger = 'rollcall' | 'export' | 'purchase' | 'laterDay';

const triggerKey = (t: ReviewTrigger) => `attend.review.${t}.v1`;
/** Before 1.0.5 a single flag covered roll call and export, whichever came first. */
const LEGACY_ASKED_KEY = 'attend.reviewAsked.v1';
const INSTALL_DAY_KEY = 'attend.installDay.v1';

let launchState: 'idle' | 'checking' | 'asked' = 'idle';

/** Free mode: the Lifetime price is 0 (launch offer). Unknown counts as Free, so we never risk a prompt then. */
async function isFreeMode(): Promise<boolean> {
  const off = await getOffering();
  return !off || (off.lifetime != null && off.lifetime.product.price === 0);
}

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  if (launchState !== 'idle') return;
  launchState = 'checking';
  try {
    if (await AsyncStorage.getItem(triggerKey(trigger))) return;
    // The old shared flag was almost always set by the roll-call ask (1.0.3+).
    if (trigger === 'rollcall' && (await AsyncStorage.getItem(LEGACY_ASKED_KEY))) return;
    if (await isFreeMode()) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(triggerKey(trigger), '1');
    launchState = 'asked';
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing affect the app
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}

/** Kept for the Report screen. */
export const maybeRequestReviewAfterExport = () => maybeRequestReview('export');

/** Once per cold launch, from the home screen: records the install day, and asks on the first later day. */
export async function maybeRequestReviewOnLaunch(): Promise<void> {
  try {
    const today = todayIso();
    const installDay = await AsyncStorage.getItem(INSTALL_DAY_KEY);
    if (!installDay) {
      await AsyncStorage.setItem(INSTALL_DAY_KEY, today);
      return;
    }
    if (installDay !== today) await maybeRequestReview('laterDay');
  } catch {
    // never let review plumbing affect the app
  }
}
