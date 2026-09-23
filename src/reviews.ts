import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const ASKED_KEY = 'attend.reviewAsked.v1';

/**
 * Ask for an App Store rating exactly once, at the moment of value: right
 * after the first successful report export (PDF or CSV). Never solicited
 * anywhere else.
 */
export async function maybeRequestReviewAfterExport(): Promise<void> {
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
