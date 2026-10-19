/**
 * Local "trial ends tomorrow" reminder. Promised on the onboarding reminder
 * screen; scheduled only once a free trial has actually started and only if
 * the user allowed notifications. Nothing is sent from a server.
 */
import * as Notifications from 'expo-notifications';
import Purchases from 'react-native-purchases';
import { ENTITLEMENT_ID, isBillingAvailable } from './purchases';

const REMINDER_ID = 'attend.trialReminder';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// If the app happens to be open when the reminder fires, still show it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Onboarding reminder screen button. True when notifications are allowed. Never throws. */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return res.granted;
  } catch {
    return false;
  }
}

interface TrialState {
  active: boolean;
  willRenew: boolean;
  expiresMs: number | null;
}

/** The pro entitlement's trial state, or null when RevenueCat can't answer (offline, not configured). */
async function getTrialState(): Promise<TrialState | null> {
  if (!isBillingAvailable()) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = info.entitlements.active[ENTITLEMENT_ID];
    if (!ent || ent.periodType !== 'TRIAL') return { active: false, willRenew: false, expiresMs: null };
    const expiresMs = ent.expirationDate ? Date.parse(ent.expirationDate) : NaN;
    return { active: true, willRenew: ent.willRenew, expiresMs: Number.isFinite(expiresMs) ? expiresMs : null };
  } catch {
    return null;
  }
}

/**
 * After a successful purchase: if it started a free trial and notifications
 * are allowed, schedule the reminder for 1 day before the trial ends.
 * Returns true when a reminder was scheduled. Never asks for permission.
 */
export async function scheduleTrialReminderIfTrial(): Promise<boolean> {
  const trial = await getTrialState();
  if (!trial?.active || !trial.willRenew) return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    const now = Date.now();
    // 1 day before the trial ends (48 hours in for the 3-day trial). Sandbox
    // trials last minutes, so there fall back to 48 hours from now; the
    // foreground check below cancels it once the sandbox trial is over.
    let fireAt = trial.expiresMs != null ? trial.expiresMs - DAY : now + 2 * DAY;
    if (fireAt < now + HOUR) fireAt = now + 2 * DAY;
    await cancelTrialReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'Your free trial ends tomorrow',
        body: 'Attendance Tracker Pro renews tomorrow. Cancel anytime in Settings, Apple ID, Subscriptions.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelTrialReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // nothing scheduled, or notifications unavailable
  }
}

/**
 * Foreground check: drop the reminder once the trial is over, or has been
 * cancelled (it would no longer renew). An unknown answer leaves it alone.
 */
export async function syncTrialReminder(): Promise<void> {
  const trial = await getTrialState();
  if (trial && (!trial.active || !trial.willRenew)) await cancelTrialReminder();
}
