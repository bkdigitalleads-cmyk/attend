# Attendance Tracker change log

Newest first. One entry per commit: date, version/build, what changed and why.

- 2026-10-15: 1.0.4 build 5. Fixed AUDIT findings 1, 2 and 3.
  - 1 and 3 (src/screens/GroupDetail.tsx, takeAttendance): today's existing session is now reopened before the free-limit check, so a free user at 5 sessions can still fix today's marks. At the limit, the group sheet closes first and the paywall opens 450 ms later, so it no longer tries to present over the fullScreen sheet (which left paywallVisible stuck true and killed every later upgrade button).
  - 2 (src/db.ts, getGroupReport): attendance % now divides by the sessions where the person has a mark, not all sessions, so people added mid-term or made inactive are not counted absent for sessions they were not on the roster. Feeds the Report tab, the average and the PDF.
  - Checked: npm ci, npx tsc --noEmit (clean). Needs a TestFlight check on device: free account at 5 sessions, tap Take attendance (paywall shows, then Settings upsell still works); late-added person shows 100% when always present.
- 2026-10-15: Added CLAUDE.md, AUDIT.md (read-only bug check from Cowork) and this log. No app code changed. Live version 1.0.3 build 4.
