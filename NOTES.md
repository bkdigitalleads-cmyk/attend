# Attendance Tracker change log

Newest first. One entry per commit: date, version/build, what changed and why.

- 2026-10-18: 1.0.5 build 6 (commit adding this note). Fixed AUDIT findings 4, 5, 6 and 7 (6 and 7 added to AUDIT.md from Brian's list).
  - 6, Pro refresh (src/state.tsx, src/purchases.ts): added a RevenueCat customer info listener, and a re-check of the `pro` entitlement whenever the app returns from the background. The re-check uses a new checkPro() that returns null on error, so being offline never removes Pro. It skips inactive -> active (purchase sheet, Face ID prompt) so it cannot race a purchase. Product ids, the entitlement id and the existing purchase/restore/getIsPro logic are unchanged; purchases.ts only gains checkPro() and onProChange().
  - 4, Face ID lock (src/LockGate.tsx): the app stays mounted while locked and the lock screen is drawn on top. iOS shows Modals above the root view, so each Modal with roster data (group page, roll call, paste roster, edit person, edit group, new group) also draws the lock screen (LockOverlay). Keyboard is dismissed on lock and the hidden content is hidden from VoiceOver. Pasted text, an open roll call and half-filled forms survive a trip out of the app.
  - 5, lapsed Pro (src/screens/Settings.tsx): Pro is required to turn the lock on, not to turn it off.
  - 7, trial copy (new src/trial.ts, src/screens/Paywall.tsx, src/screens/Settings.tsx): "N days free", "then", "No payment now", the trial part of the 3.1.2 disclosure and the Settings "Starts with 3 days free" only show when RevenueCat reports the user ELIGIBLE for that product's intro offer. Otherwise the plain price shows. Removed the hard-coded "3 days free" fallback in the paywall subtitle.
  - app.json: version 1.0.5, buildNumber 6.
  - Checked: npm ci, npx tsc --noEmit (clean). npx expo-doctor: 19/21 pass; the 2 failures are its network checks (exp.host and React Native Directory unreachable from the sandbox), not project issues. Not run on a device or simulator from here; needs the TestFlight checks listed in the PR.
  - Noticed, not changed:
    - The app has no photo feature, so "in-progress photos" from the request does not apply here; the overlay keeps forms and roll calls instead.
    - store/metadata.md review notes say every plan row states the trial length. True for a fresh sandbox account (what App Review uses), but no longer for a tester who already used the trial.
    - index.html and support.html list "after a 3-day free trial" as general pricing. Fine as a price list, left as is.
    - refreshPro() in src/state.tsx is not called anywhere.
- 2026-10-15: 1.0.4 build 5. Fixed AUDIT findings 1, 2 and 3.
  - 1 and 3 (src/screens/GroupDetail.tsx, takeAttendance): today's existing session is now reopened before the free-limit check, so a free user at 5 sessions can still fix today's marks. At the limit, the group sheet closes first and the paywall opens 450 ms later, so it no longer tries to present over the fullScreen sheet (which left paywallVisible stuck true and killed every later upgrade button).
  - 2 (src/db.ts, getGroupReport): attendance % now divides by the sessions where the person has a mark, not all sessions, so people added mid-term or made inactive are not counted absent for sessions they were not on the roster. Feeds the Report tab, the average and the PDF.
  - Checked: npm ci, npx tsc --noEmit (clean). Needs a TestFlight check on device: free account at 5 sessions, tap Take attendance (paywall shows, then Settings upsell still works); late-added person shows 100% when always present.
- 2026-10-15: Added CLAUDE.md, AUDIT.md (read-only bug check from Cowork) and this log. No app code changed. Live version 1.0.3 build 4.
