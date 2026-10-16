# Attend audit (Oct 15 2026)
## Findings
1. [HIGH] Paywall at the free session cap never appears, and every other upgrade button then stays dead until the app is force-quit
   - Where: src/screens/GroupDetail.tsx:83 (showPaywall called while GroupDetail's fullScreen Modal at :223 is up); PaywallModal is a root-level sibling at App.tsx:110
   - What happens: Free user with 5 sessions opens their group and taps "Take attendance today". showPaywall() flips paywallVisible to true. The Paywall Modal is presented from the root view controller, which is already presenting GroupDetail. UIKit refuses ("already presenting"), so nothing appears. RN's Fabric modal host still sets its internal _isPresented = YES (node_modules/react-native/React/Fabric/Mounting/ComponentViews/Modal/RCTModalHostViewComponentView.mm:173), so paywallVisible stays true for good. Every later showPaywall() (Settings upsell, Report PDF/CSV, Face ID toggle, add group) sets the same value, React skips the update, and no paywall ever shows until the app is killed. This happens at the main conversion moment (hitting the 5-session cap).
   - Fix: In takeAttendance, close the group sheet first and open the paywall after the dismiss animation: `onClose(); setTimeout(showPaywall, 450); return;`. Chores' TaskEditor already does this.
2. [MED] Attendance % treats sessions held before a person joined, or after they were made inactive, as absences
   - Where: src/db.ts:428-429 (`denom = sessions.length`); feeds the Report tab, avgPct and the PDF summary (src/report.ts:245, :310)
   - What happens: insertSession only pre-marks people who are on the roster at that moment (db.ts:300-304). A student added in week 5 of a 20-session term with perfect attendance shows 75% in amber, even though the PDF grid prints "·" (not marked) for those first 15 sessions. "Mark inactive (keep history)" has the same effect on everything after the person was made inactive. The group average gets pulled down too. Teachers hand this PDF in to an office.
   - Fix: Use the sessions where the person has a mark as the denominator: `const denom = t.marked;`.
3. [LOW] "Take attendance today" shows the paywall even when today's session already exists
   - Where: src/screens/GroupDetail.tsx:83-91
   - What happens: A free user who has used all 5 sessions, one of them today, taps the button again to fix a mark. The limit check runs before the existing-session lookup, so they get the paywall (which, with finding 1, also breaks every later paywall) instead of reopening today's roll call.
   - Fix: Move the `existing` lookup (lines 87-91) above the FREE_SESSION_LIMIT check.
4. [LOW] With Face ID lock on, any trip out of the app closes whatever was open
   - Where: src/LockGate.tsx:53 (the children are swapped out for the lock screen, so they unmount)
   - What happens: The user is in a roll call, or partway through pasting a roster, and switches apps. On return and unlock, GroupDetail remounts with rollId reset to null and the paste text cleared. They land back on the group page. Marks already tapped are saved, but any pasted roster text is lost.
   - Fix: Keep the children mounted and put the lock screen over them as an absolutely positioned overlay (or a Modal) while locked.
5. [LOW] After Pro lapses, the Face ID lock can't be turned off
   - Where: src/screens/Settings.tsx:21
   - What happens: A user turns the lock on during the 3-day trial and then cancels. The lock keeps working (LockGate doesn't check Pro), but flipping the switch off opens the paywall instead.
   - Fix: Gate only when turning it on: `if (!isPro && !settings.lockEnabled)`.

## Checked and fine
- purchases usage: init before getIsPro in state.tsx; buy/restore paths set isPro only on an active 'pro' entitlement; cancel is silent; the Lifetime $0 launch-offer path is handled
- Settings restore: checks isBillingAvailable, shows a found/none/failed alert for each outcome; setIsPro(false) only when RevenueCat confirms no entitlement
- Free-tier gating: 1 group (Groups.tsx:33), 5 sessions (GroupDetail.tsx:83), PDF/CSV/Face ID behind Pro. No route found that gives a free user Pro
- Rating prompt: fires once after the first RollCall is closed (countSessions >= 1 always true at that point) and after the first export; the asked flag is stored before requestReview
- db.ts: single v1 schema with CREATE IF NOT EXISTS; git history shows no column ever added, so no migration is needed; FK cascades are correct; bulk insert runs in a transaction
- Dates: todayIso/shiftDate/prettyDate all use local components; no toISOString date bugs
- CSV/PDF: escaping, empty-session guard, cache file overwrite and Sharing availability check all look correct
- JSON.parse of settings is wrapped in try/catch with defaults; Onboarding fails open
- LockGate on cold start: it mounts after ready, so the first Face ID prompt fires correctly
