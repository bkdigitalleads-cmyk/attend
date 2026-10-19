# Attendance Tracker change log

Newest first. One entry per commit: date, version/build, what changed and why.

- 2026-10-19: 1.0.5 build 6, fix for the failed EAS build (commit adding this note). Build 6 never uploaded, so the number stays.
  - What failed: EAS workflow 01a153db (main at 052e25f) stopped at Run fastlane. The "Attend App Store" provisioning profile has no Push Notifications capability and no aps-environment entitlement, but the build asked for both.
  - Why: expo-notifications' config plugin ran even though it is not in app.json. Expo auto-applies it when the package is installed (prebuild-config's versioned SDK plugins, which use the installed package's own plugin over the built-in fallback). It adds `aps-environment`. The 1.0.5 entry below wrongly said leaving it out of app.json was enough; I misread that code.
  - Fix: new local config plugin plugins/withoutPushEntitlement.js, listed last in app.json "plugins". It deletes `aps-environment` from the entitlements with withEntitlementsPlist. The app only schedules a local notification (the trial reminder), which does not need push. expo-notifications only registers for remote push inside getDevicePushTokenAsync, which the app never calls.
  - Checked: `npx expo prebuild --platform ios --no-install --clean` in scratch copies (the ios/ folder is not committed).
    - Before the fix: AttendanceTracker.entitlements had `aps-environment` = development, and `npx expo config --type introspect` showed ios.entitlements {"aps-environment":"development"}. This is the same failure as the build.
    - After the fix: the .entitlements file is an empty dict, nothing under ios/ mentions aps-environment, the pbxproj has no Push/SystemCapabilities entries, Info.plist has no remote-notification background mode, and introspected ios.entitlements is {}.
    - npx tsc --noEmit clean.
  - Still to confirm on EAS: the build gets past fastlane and uploads. If EAS has already enabled Push on the App ID in the Apple Developer portal, that is harmless; the profile just has to match the empty entitlements.
- 2026-10-19: 1.0.5 build 6, second scope for PR #1 (1d71be1). Still 1.0.5 build 6, nothing merged.
  - Rule override, logged as asked: Brian authorized changing the rating-prompt triggers for this job, overriding the CLAUDE.md rule once. All other CLAUDE.md rules still apply.
  - New dependency (Brian approved): expo-notifications 57.0.10. Installed with npm, not `npx expo install`, because exp.host is blocked from this sandbox. 57.0.10 is inside SDK 57's bundled range (~57.0.10) and needs the expo-constants and @expo/image-utils versions already installed. The newest 57.0.x would have bumped expo-constants and three other packages, so it was not used. Adds only expo-notifications, expo-application and badgin to the lockfile. It is not listed under app.json plugins on purpose: the plugin would add the push `aps-environment` entitlement, which local notifications do not need, so EAS signing stays as it is.
  - Onboarding (new src/screens/Welcome.tsx, App.tsx): runs once on first launch and is stored under the existing `attend.onboarded.v1` flag. Users with any group or session skip it, and the flag is then set. Order:
    1. Three value screens.
    2. "Try Attendance Tracker Pro free" and the reminder screen, both only when RevenueCat says the Apple ID can get the trial and the Lifetime launch offer is not free. The reminder screen's Continue asks for notification permission.
    3. The paywall. On first launch only, its X appears after 3 seconds.
    4. The existing "where did you hear about us" question.
    The free-cap paywall is unchanged apart from shared code.
  - Trial reminder (new src/reminder.ts): a local notification, "Your free trial ends tomorrow" / "Attendance Tracker Pro renews tomorrow. Cancel anytime in Settings, Apple ID, Subscriptions."
    - Scheduled after a successful purchase from any paywall, only if that purchase started a free trial (entitlement periodType TRIAL) and notifications are already allowed. Permission is only ever requested on the onboarding reminder screen.
    - Fires 1 day before RevenueCat's trial expiration date. That is 48 hours in for the 3-day weekly trial, and the right day for the 7-day yearly trial too. Sandbox trials last minutes, so there it falls back to 48 hours from now.
    - Cancelled after any successful restore, and on launch or return from background when the trial is over or will no longer renew (the user cancelled, so "renews tomorrow" would be wrong). An offline check leaves it alone.
    - When it is scheduled, the "You're all set" alert adds "We'll remind you 1 day before your trial ends." That line is the visible sign on TestFlight that it was scheduled.
  - Rating prompt (src/reviews.ts, App.tsx, GroupDetail.tsx):
    - Four triggers: first finished roll call and first export (as before), plus right after a trial or purchase from the onboarding paywall (when its alert is dismissed), plus the first launch on a later calendar day than install. I read "second launch on a different calendar day" as the first launch on any later day; a strict launch count would rarely fire.
    - Each trigger fires once, at most one prompt per launch, and StoreKit's own limits still apply. The old ask-once-ever rule is gone.
    - Never in Free mode (Lifetime price 0); if the price can't be read, it also skips. A trigger skipped for Free mode or the one-per-launch rule is not used up.
    - The old `attend.reviewAsked.v1` flag counts as the roll-call ask, so existing users can still get the export, purchase and later-day asks.
    - The install day is stored on the first 1.0.5 launch, so upgraders get the later-day ask on their next day of use.
    - The later-day ask waits until any Face ID unlock.
  - Get Pro button (src/screens/Groups.tsx): an amber "⭐ Get Pro" pill next to the Groups title for non-Pro users. It opens the paywall and is hidden for Pro.
  - store/metadata.md: drafted App Review notes for 1.0.5 (X after 3 seconds, fully usable free up to 1 group and 5 sessions, trial wording only when eligible, local reminder). The old 1.0 notes are kept above it. This replaces the earlier "noticed" item about the review notes.
  - AUDIT.md: added a "Not audit findings" section listing this scope.
  - Checked: npx tsc --noEmit (clean). npx expo-doctor: 19/21, same 2 network-only checks fail as before (exp.host and React Native Directory unreachable). expo-notifications 57.0.10 matches the version SDK 57 bundles (~57.0.10). Not run on a simulator or device from here.
  - Noticed, not changed:
    - The Free-mode onboarding paywall also gets the 3-second X delay. Everything else about Free mode (Lifetime leads, "Get Pro free") is as before. Easy to exempt if Brian wants the X right away there.
    - docs.expo.dev is blocked from this sandbox, so the expo-notifications API was checked against the installed 57.0.10 package's type definitions.
- 2026-10-18: 1.0.5 build 6 (c6e84e3). Fixed AUDIT findings 4, 5, 6 and 7 (6 and 7 added to AUDIT.md from Brian's list).
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
