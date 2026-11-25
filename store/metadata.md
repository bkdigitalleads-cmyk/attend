# Attendance Tracker: Check In, App Store metadata (current for 1.0.7)

## Identity
- **App name (28/30):** `Attendance Tracker: Check In`
- **Subtitle (28/30):** `Class, Team & Meeting Roster` (en-US and es-MX, as live in App Store Connect)
- Bundle id: `com.bwk.attend` · slug `attend` · owner `bkdeveloper123`
- Categories: Education (primary), Productivity (secondary)
- Age rating: 4+

Name = the keyword (Young). Exact phrase "Attendance Tracker" is taken, so the second
keyword ("check in", Apple popularity 39, ASOMobile 436) follows the colon. Subtitle carries
"roster" (23 / 162) plus the class/team/meeting audience words. Until it was filled in App Store
Connect the subtitle was `Class & Team Roster` (19/30).

## Keywords (no title or subtitle words; no spaces after commas)

Changed in 1.0.6. The US store indexes both en-US and es-MX, so the two sets do not repeat each other.

**en-US (97/100):**
`roll,call,sign,sheet,coach,teacher,student,church,sunday,school,daycare,guest,list,scout,club,log`

**es-MX (99/100), English keywords on purpose:**
`classroom,youth,group,event,visitor,headcount,camp,gym,practice,member,staff,employee,register,kids`

es-MX keeps the English app name and subtitle (`Attendance Tracker: Check In`, `Class, Team & Meeting Roster`). Neither keyword field uses a word from that name or subtitle.

Until 1.0.5 both locales had the same set: `roll,call,register,sign,sheet,coach,teacher,student,club,church,school,log,employee,staff,daycare` (95).

## Extra listings indexed for US search (added for 1.0.7)

Apple also indexes these eight localizations for US search. Each has its own English name, subtitle and keyword field, and uses the English description. Visual Timer and Chores already ship with the same set. Entered in App Store Connect by Brian / Cowork.

Rules: name and subtitle at most 30 characters, keywords at most 100 bytes with no spaces, no word repeated inside a field, and no keyword taken from that listing's own name or subtitle. Every row below was checked with a script (counts in brackets). This repo has no test suite, so there is no committed length test.

Wording rule: only promise what the app does. The leader keeps a roster, everyone starts Present, and the leader taps absent, late or excused; then a PDF or CSV report. No self sign-in by attendees or visitors, no arrival times or hours (not a time clock or payroll), no schedules or shift rosters.

| Locale | Name | Subtitle | Keywords |
|---|---|---|---|
| ar-SA | `Roll Call: Class Attendance` (27) | `Student Check In & Roster` (25) | `teacher,classroom,school,tracker,sheet,register,taker,daily,report,absent,present,late,log` (90) |
| fr-FR | `Meeting Attendance for Clubs` (28) | `Committee & Board Roll Call` (27) | `tracker,register,member,church,headcount,roster,group,volunteer,nonprofit,ministry,council,chapter` (98) |
| ko | `Team Attendance: Roster App` (27) | `Coach Check In for Practice` (27) | `tracker,sports,player,youth,scout,camp,club,dance,gym,class,log,sheet,headcount` (79) |
| pt-BR | `Church Attendance Tracker` (25) | `Sunday School & Youth Group` (27) | `check,in,roll,call,member,visitor,small,class,roster,headcount,register,log,sheet` (81) |
| ru | `Attendance Sheet: Head Count` (28) | `Class Roster & Roll Call App` (28) | `tracker,check,in,student,teacher,daycare,camp,club,event,guest,member,staff,log` (79) |
| vi | `Team Roll Call: Staff & Crew` (28) | `Training & Toolbox Talk Record` (30) | `attendance,tracker,sheet,register,headcount,daily,report,member,group,safety,meeting,workshop` (93) |
| zh-Hans | `Attendance Register: Classes` (28) | `Teacher Roll Call & Roster` (26) | `tracker,student,school,classroom,homeschool,tutor,lesson,course,check,in,sheet,log` (82) |
| zh-Hant | `Volunteer Attendance Tracker` (28) | `Event Check In & Member List` (28) | `roster,guest,visitor,group,headcount,register,sheet,log,society,alumni,fraternity,sorority,charity` (98) |

Changed from the first draft (Nov 25):
- fr-FR name was `Sign In Sheet: Visitor Log`: "sign in sheet" means attendees sign themselves in, and "visitor log" means logging walk-in visitors with arrival times. The app has neither. Subtitle was `Guest Check In & Event List`: reads as arrival check-in at an event desk, which does not fit a roster where everyone starts Present. Now meetings, clubs and boards; keywords adjusted so none repeats the new name or subtitle.
- vi name was `Employee Attendance: Check In`: reads as an employee time clock (clock in/out, hours, payroll). Subtitle was `Staff Roster & Meeting Log`: "staff roster" usually means a shift schedule, and "meeting log" suggests minutes. Now team, staff and crew roll call for training and toolbox talks.
- zh-Hant name was `Meeting Attendance: Sign In`: self sign-in again. Now volunteers, events and members; `Club Member Check In & List` became `Event Check In & Member List`.
- ar-SA, ko, pt-BR, ru, zh-Hans: unchanged.

## Description

Attendance Tracker: Check In takes roll for your class, team, club, or group in one tap and exports the attendance report as PDF or CSV.

Add the roster once. Each session, everyone starts Present and you tap only the exceptions: absent, late, or excused. Every tap saves on the spot. Works offline in the gym, on the field, or in a classroom with no signal.

TAKE ROLL IN SECONDS
• One tap per exception, not one tap per person
• Present, absent, late, excused, with live counts
• Move a session to an earlier date, name it, or delete it

ANY GROUP WITH A ROSTER
• Class periods, sports teams, clubs, Sunday school rooms, crews, staff
• Type names or paste a whole roster at once
• Mark people inactive to keep their history

THE REPORT YOUR OFFICE ASKS FOR
• PDF with per-person totals and percentages plus the full register grid by date, with a signature line
• CSV export, one row per person per session, for spreadsheets and portals

PRIVATE BY DESIGN
• Rosters never leave your iPhone. No account, no cloud, no tracking
• Optional Face ID lock

Free to start with one group and five sessions. Pro unlocks unlimited groups and sessions, the PDF report, CSV export, and Face ID lock. Pro is a Weekly subscription ($4.99/week after 3 days free), a Yearly subscription ($29.99/year after 7 days free), or a one-time Lifetime purchase ($59.99). Subscriptions renew automatically until cancelled in your Apple ID settings.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/attend/privacy.html

## Promotional text (<=170)
Take roll in one tap: everyone starts present, tap only the exceptions. Export the attendance report as PDF or CSV. Offline, no account.

## What's New (1.0.7)
Small fixes and improvements.

## What's New (1.0.6)
Yearly is now the first plan on the upgrade screen, with small fixes.

## What's New (1.0)
First release. Roster, one-tap roll call, per-person totals, PDF and CSV attendance report.

## Pricing (RevenueCat: entitlement `pro`, offering `default`)
- `attend_pro_yearly`: auto-renewing, **$29.99/year**, 7 days free, $rc_annual (primary since 1.0.6: listed first, preselected, BEST VALUE tag)
- `attend_pro_weekly`: auto-renewing, **$4.99/week**, 3 days free, $rc_weekly (primary until 1.0.5)
- `attend_pro_lifetime`: non-consumable, **$59.99**, $rc_lifetime
- ONE subscription group "Attend Pro" with group-level localization set immediately

## App Review Notes (paste into ASC)
The paywall opens on first launch. Each plan row states the free-trial length and the price after it ("3 days free, then $4.99/week"). The subscription titles, lengths, prices and functional Terms of Use (EULA) and Privacy Policy links are pinned at the bottom of the paywall, visible without scrolling, and repeated in Settings > Purchases & support. Restore Purchases is on the paywall and in Settings. No account is needed; all data is stored on-device. To test: close the paywall with the X, answer or skip the one-tap question, add a group, add a few names under People, then Take attendance today.

## App Review Notes for 1.0.5 (draft, paste into ASC with the 1.0.5 submission)
Version 1.0.5 adds a short first-launch introduction. Three screens explain what the app does. If the Apple ID can still get the free trial, two more screens follow: one offers the trial, and one asks for notification permission so the app can send a single reminder 1 day before the trial ends. Then the paywall opens.

The close button (X) at the top right of the first-launch paywall appears after 3 seconds. Tap it to continue without buying. The app is fully usable for free, with no time limit, up to the free limit of one group and five roll-call sessions. Pro adds unlimited groups and sessions, the PDF and CSV attendance report, and Face ID lock.

Each plan row shows its price. The free-trial length is shown only when the Apple ID is eligible for the trial. The subscription titles, lengths, prices and working Terms of Use (EULA) and Privacy Policy links sit at the bottom of the paywall, visible without scrolling, and again in Settings > Purchases & support. Restore Purchases is on the paywall and in Settings. The reminder is a local notification scheduled on the device only after a free trial starts; nothing is sent from a server. No account is needed and all data stays on the device.

To test: tap Continue through the introduction, close the paywall with the X after 3 seconds, answer or skip the one-tap question, add a group, add a few names under People, then tap Take attendance today. The Get Pro button on the Groups screen opens the paywall again.

## App Privacy (App Store Connect label)
Data type collected: Purchases (purchase history), not linked to the user, not used for tracking. It comes from RevenueCat validating purchases. privacy.html says the same in its Purchases section. Rosters and attendance data stay on the device and are not collected.

## URLs
- Privacy: https://bkdigitalleads-cmyk.github.io/attend/privacy.html
- Support: https://bkdigitalleads-cmyk.github.io/attend/support.html
- Marketing: https://bkdigitalleads-cmyk.github.io/attend/
