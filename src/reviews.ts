import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const ASKED_KEY = 'attend.reviewAsked.v1';

/**
 * Ask for an App Store rating exactly once, at a moment of value: after the
 * third roll call is finished, or right after the first report export (PDF or
 * CSV), whichever comes first. Never solicited anywhere else. Export is a Pro
 * feature, so without the roll-call trigger free users would never be asked.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing affect the app
  }
}

/** Kept for the Report screen; same single ask. */
export const maybeRequestReviewAfterExport = maybeRequestReview;
