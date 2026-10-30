# KidRota — handover

Where the project stands, for anyone (person or AI session) picking it up.
`README.md` is the reference for how the app works and why; this file is
the *state of play*: what is done, what is unproven, what is still open.
Keep it current — update it at the end of every working session.

**Last updated:** 30 October 2026 (production application submitted; demo video draft 7)
**Working branch:** `claude/eloquent-brahmagupta-f1d5v1` — *all* current
work is here; `main` is well behind. Check this branch out before doing
anything.

---

## The owner and how they work

- Windows, **Command Prompt** (not PowerShell — npm is blocked there by
  execution policy). Project at `C:\Users\robta\kidrota`.
- Android Studio, testing on a **Samsung SM-A346B** over USB.
- Wants **one command at a time**, explicit steps, and clear flags on
  anything unverified or blocking. Likes visual explanations and analogies.
- Their update routine after any change: `git pull`, `npm run build`,
  `npx cap sync android` (separate lines), then Run in Android Studio.
  `npx cap sync` rewrites `android/capacitor.settings.gradle` and
  `android/app/capacitor.build.gradle` on their PC, so those two files often
  show as modified locally — harmless.
- Proven working agreements: verify in a real browser with Playwright
  rather than assuming; measure contrast numerically (WCAG AA) in both
  themes; keep pure logic in `src/utils/` with unit tests; never change the
  package ID `com.kidrota.app`.

## What the app is today (version 1.0.1, on internal testing)

Local-first Android app (Capacitor 8 + React 19 + SQLite, no server, no
accounts). Plan childcare across school holidays with timed sessions (one
carer per child at a time), gaps shown in red, share week pictures,
backup/restore, reminders, feedback by email.

**1.0.1 = the owner's internal-test feedback (4 Oct 2026), all done in code
and checked in the browser at phone size; none of it seen on the phone yet:**

- 12 child colours (was 6).
- Onboarding carers: "Au pair" gone, "Grandma"/"Grandad" merged into
  "Grandparents" (grid name "Grands"); suggestions and the parent's own
  carers share one list — tap to tick/untick, Edit to rename/retype/remove.
- **AM/PM mode removed.** Set times only; Morning/Afternoon/All day are
  one-tap presets. Migration **v3** converts old AM/PM rows to times
  (AM 08:00–12:00, PM 12:00–18:00, all day 08:00–18:00), also on restoring
  an old backup.
- Saved times: tick "Save these times for next time" on typed times; "Edit
  saved times" renames/retimes/removes any preset, defaults included.
- Session form: who, when, **Also for** (other children) and **Which days**
  (just this day / every day / every Tuesday / Mon–Fri / pick days), for
  adding *and* editing; editing pre-ticks children who have the same session.
- **One carer per child at a time:** overlapping times on the day are refused
  with the clash named; on other days chosen, the new session replaces what
  overlaps (`applySession` in `db/assignments.ts`).
- "Pick days" fixed: selected days are now filled blue with a tick (they
  barely changed before), and Sat/Sun only show when the holiday has weekends.
- Save buttons + "Saved ✓" for copying a day, for sessions across days, and
  for the day's note (the note no longer saves on every keystroke).
- Tapping a child's cell in the week opens that day scrolled to that child,
  outlined.
- Week view: Prev/Next at the top and bottom, bigger arrows everywhere; each
  cell shows from–to times ("9–12 Mum"); short names max 7 characters, so
  five days fit at 360px wide without scrolling.
- Home: "3 days incomplete · 7 complete" instead of "covered/gaps"; the bar
  is green complete / amber part-planned / red nothing; "Gaps to fill" stays.
- **Sharing is pictures only.** Share codes, "Send a plan to someone" and
  "Add a plan someone sent you" are removed (owner's decision: keep it
  simple, family don't need the app or Pro). Share offers this week or the
  whole holiday (one picture per week); every day of the week is always in
  the picture. Privacy policy wording updated (`privacy.html` in the
  `RobT8/t80-site` repo, dated 4 Oct 2026) — live on t80.dev since 30 Oct. Store listing and website
  bullets updated to match.

- **Free:** unlimited children, 1 holiday *ever* (deleting it does not free
  the slot; a finished holiday's dates lock). The one-child cap was dropped
  on 3 Oct 2026. **Pro:** £1.99/year auto-renewing subscription
  `kidrota_pro_yearly` — unlimited holidays, custom carer colours. No lifetime option.
- The day runs 08:00–18:00; a day is complete only when every child has no gap.
- Legal pages: `https://t80.dev/kidrota/privacy.html` and `terms.html`
  (source in the `RobT8/t80-site` repo, folder `public/kidrota/`; privacy 4 Oct, terms 3 Oct, licences 27 Sep 2026). Contact `kidrota@t80.dev`.
- Icon "AB1" (calendar + grown-up + child); source `design/icon/`.
- 291 tests pass; `npm run lint` and `npm run build` clean (as of this file).
- **Pre-release review done 27 Sep 2026 — `PRE-RELEASE-REVIEW.md`.** The
  owner approved B1-B2 and S1-S12 (keep `allowBackup` on); all are fixed and
  listed in the report's "Fix status" table. The N-list (nice to have) is
  not done.
- **Home rating card** (added 27 Sep 2026): in-page, not a pop-up; from the
  5th open once something is planned; "Not now" = 10 more opens, 3 strikes
  and it's gone; tapping Rate (card or Settings) retires it. See README
  "Home rating card". Not yet seen on the phone.
- Reminders default **Off**; every holiday is at most **10 weeks**
  (`MAX_HOLIDAY_DAYS`); backup restore is validated and all-or-nothing, and
  asks for confirmation.

## Verified on the phone vs not

See the README's **Tested on hardware** table for the detail. In short:

- ✓ Billing connects to Play, free-tier limits, Rate-this-app link, share
  sheet, backup export, database survives uninstall + reinstall, new icon.
- **Fixed but not re-confirmed on the phone:** backup *restore*; navigation
  buttons readable over white sheets; splash screen; Settings showing the
  version (first build since `build.gradle` reads `package.json`).
- **All of 1.0.1 (list above)** — especially the v3 migration running over
  the AM/PM data already on the phone, and week pictures arriving in WhatsApp.
- **Never seen:** a reminder notification actually arriving; the feedback
  form opening the email app (`mailto:`); a real purchase, restore, cancel
  or refund; the in-app review card. The last three need a Play testing
  track.
- **Edge-to-edge (Android 15+): believed fine** (review P2). Capacitor 8's
  SystemBars either pads the window natively (WebView < 140) or passes real
  insets to CSS `env(safe-area-inset-*)`, which `index.css` uses. Still confirm
  on the phone.
- **Reminders: fixed in code, not yet seen on the phone** (review B2) — they
  used to open Android 14's "Alarms & reminders" page; now inexact, and
  `SCHEDULE_EXACT_ALARM` is removed from the merged manifest.

## Review findings in one screen (27 Sep 2026)

| | Finding | Where |
|---|---|---|
All rows below are **fixed** (27 Sep 2026); the phone checks P1-P13 in the
report are still to do.

| 🔴 B1 | Privacy policy/terms say data is never backed up; auto-backup is on | `docs/privacy.html:53`, `AndroidManifest.xml:5` |
| 🔴 B2 | Reminders bounce to "Alarms & reminders" on Android 14+ | `utils/notifications.ts:62-70` |
| 🟠 S1 | Backup restore: one bad row wipes everything; no confirm | `db/backup.ts:234` |
| 🟠 S2 | Share codes not validated (bad carer type breaks Carers screen) — share codes since removed (1.0.1) | was `utils/shareCode.ts:159` |
| 🟠 S3 | One free holiday can span a whole year | `components/HolidayForm.tsx:41` |
| 🟠 S4-S12 | Reminder default, policy gaps, pending purchase msg, mode switch, share-cancel error, 48 dp targets, one contrast fail, licences page, README | see report |

Verified good: Billing Library 9.0.0, acknowledgement, lapse/refund
handling, 16 KB-aligned native libs, release WebView debugging off, no
secrets in git, contrast elsewhere in both themes, 200 % font layout.

## Play Store progress (30 October 2026)

**Where things stand:** the 14-day closed test (12+ testers) is **complete**.
**Production application submitted 30 Oct 2026** (answers as sent in
`PRODUCTION-APPLICATION.md`); waiting for Google, up to about 7 days.
Keep the closed test running until the decision arrives.

- ✅ Play Console personal account, identity verified. App "KidRota School
  Holiday Planner", package `com.kidrota.app`, Free.
- ✅ Upload key `C:\Users\robta\KidRota-keys\kidrota-upload.jks` (alias
  `upload`). 1.0.1 (versionCode 10001) is on internal testing and
  **Closed testing – Alpha** (177 countries; testers from a paid testing
  service plus the "Me" list).
- ✅ App content forms (PEGI 3, 18+, no data collected, no sign-in), store
  settings, store listing (`STORE-LISTING.md`: keyword description, coral
  captioned screenshots and feature graphic in `design/store/`).
- ✅ Payments profile (individual, UK, bank verified). Subscription
  `kidrota_pro_yearly` ("KidRota Pro"), base plan `yearly`, £1.99,
  auto-renewing, active. Payments are **Google Play Billing only** (no
  Stripe: Play requires its own billing for digital features).
- ✅ Testing service report (25 Oct): no crashes or bugs. Still to do from
  it, in 1.0.2: a short "How it works" page and a privacy line on the
  welcome page.
- ✅ Closed test 14 days **finished** (owner confirmed, 30 Oct 2026).
- ✅ **Applied for production** 30 Oct 2026. ⏳ Awaiting Google's decision.
- ✅ Demo video **draft 7** (47.5 s): `design/store/video/kidrota-demo.mp4`.
  See "Demo video" below. Not yet on YouTube or the listing.
- ⏳ Licence testing (Settings → License testing → list "Me") is set, but a
  test purchase on 23 Oct still showed a real charge. Check the phone's
  Play account is in the "Me" list, then test purchase / restore / cancel
  (review P6-P10).
- ✅ Website moved to GitHub (30 Oct 2026): the legal pages live in the
  **`RobT8/t80-site`** repo (folder `public/kidrota/`, one folder per app;
  `docs/` here is removed). Cloudflare Worker **`t80-site`** (Workers Builds,
  connected to that repo) serves `t80.dev`; owner confirmed
  `t80.dev/kidrota/privacy.html` shows 4 Oct 2026. The old hand-uploaded
  Pages project **`t80-dev`** has no domain now; kept as a backup, delete
  later. Checked 30 Oct: all pages load, and a push to `t80-site`
  redeploys by itself (test: `robots.txt` appeared). Optional later: switch
  off the `t80-site.<account>.workers.dev` address (it shows the account
  name; owner not bothered for now).
- ⏳ Trader status (public address on the listing): still to decide.
- ⏳ GitHub Actions release workflow (`.github/workflows/release.yml`) is
  written but unused: needs merging to `main`, four secrets and a Play
  service account. The owner deferred this.

## Demo video

Source and rebuild steps live in `design/store/video/source/`:

- `record2.cjs`: Playwright recording of the app (needs the dev server on
  port 5173) → `video2/demo.webm`. Already recorded; no need to redo.
- `v2layers.cjs`: renders the background, phone frame, title and end cards
  and the eight headlines → `v2/*.png`.
- `v2build.py`: cuts and times the scenes, moves the "camera" (a crop of
  half the phone, which follows each tap), adds headlines, voice and music →
  `../kidrota-demo.mp4`. Run `python3 v2build.py` (needs ffmpeg).
- Voice: ElevenLabs v4 turbo on Higgsfield, voice "Raina" (preset
  `1c3a4775-9afb-52c1-a2bf-b6543231a9a1`). `vo2/vo2.mp3` is the full take;
  lines 3 and 6 were re-recorded on their own (`vo2/line3.mp3`,
  `vo2/line6.mp3`). Music: "Taking Flight" (Blue Deer Studio),
  `vo2/music-taking-flight.mp3`. The cloud container can't download from
  Higgsfield's CDN, so the owner downloads new takes and attaches them.

Current script (what's on screen in brackets):

1. (Title card, then home) "Every school holiday, I never know who is
   looking after which kid and when! So I plan it all in KidRota."
2. (Week grid) "Here's half term. Anything in red is a gap."
3. (Booking, slowed so words land on taps) "I tap Ava, then Monday, pick
   the holiday club, eight till three, tick Leo too, and copy it to
   Tuesday and Wednesday."
4. (Cut straight to picking Mum, Rest of day) "Then I take over for the
   rest of the day."
5. (Cut straight to the filled week) "Now I can see Friday afternoon still
   needs sorting."
6. (Share panel) "Once it's updated, I can share the plan as a picture,
   straight to the family WhatsApp, so that Dad, grandparents and anyone
   else all know the plan."
7. (Home) "No account, no ads, and everything stays on my phone."
8. (End card) "KidRota. School holiday care, sorted."

Open question for the owner: the share panel sits still for about 8 s.
Option offered: show the actual week picture instead. Then upload to
YouTube and add the link to the store listing.

## Waiting on the owner (outside the code)

- [x] **Apply for production**: submitted 30 Oct 2026. Watch email and
      the Dashboard for the decision (up to about 7 days).
- [x] `t80.dev` moved to the `t80-site` Worker; privacy shows 4 Oct 2026.
- [x] Terms, licences and the KidRota home page load on t80.dev (30 Oct).
- [ ] Delete the old Cloudflare Pages project `t80-dev` (no domain now;
      reminder set for 6 Nov 2026).
- [ ] Fix licence testing, then test purchase / restore / cancel. Play
      Console account is the developer account; the licence-tester list must
      hold the Google account the *phone's Play Store* uses.
- [ ] Trader-address decision.
- [ ] Email forwarding for `kidrota@t80.dev`.
- [ ] Demo video: approve, upload to YouTube, add link to the listing.

## Open decisions

Settled 27 Sep 2026: keep Android auto-backup **on** (wording fixed);
reminders default **Off**; holidays capped at **70 days**.

1. Remove the **Contact support** row? Review recommends **yes** (N5).
2. Align "code" vs "message" wording? Review recommends **"message"
   everywhere** (N6).
3. Which of the other nice-to-haves (N1-N14) to do before closed testing.
4. Trader status on Play (EU DSA): selling a subscription makes the owner a
   trader, so an address is shown publicly on the listing — pick which
   address before filling that form.

## Next steps, in order

1. ~~Apply for production~~: submitted 30 Oct 2026; waiting on Google.
2. While waiting for approval: fix licence
   testing and run the purchase tests, decide trader status.
3. Build **1.0.2**: "How it works" page and a privacy line on the welcome
   page (from the testing report). Bump versionCode to 10002.
4. Once production is approved: create a production release (1.0.1 or
   1.0.2), staged rollout if offered.
5. Demo video: finish it, upload to YouTube, add the link to the listing.
6. Later: set up the GitHub Actions release workflow.

## Pre-release review prompt

Used on 27 Sep 2026 (result: `PRE-RELEASE-REVIEW.md`). Kept for re-running
before a later major release:

```
You are the world's leading Android and app-release expert. Do a complete
pre-release review of KidRota before it is uploaded to Google Play. Read
README.md and HANDOVER.md first. Work on branch
claude/eloquent-brahmagupta-f1d5v1.

RULES
- Verify, don't assume. Read the actual code, config, and the source of
  every Capacitor/Cordova plugin involved (node_modules) — including their
  AndroidManifest.xml files, since those merge into the app.
- Check UI in a real browser with Playwright at phone size, light and dark.
  Measure contrast numerically (WCAG AA), never by eye.
- Run npm test, npm run lint, npm run build. Report failures verbatim.
- Do NOT change code during the review. Report first; I will approve fixes.
- Separate "verified" from "believed" and from "only testable on a real
  phone or in Play Console".

REVIEW AREAS
1. Play policy & listing: merged permissions and any needing a Play
   declaration (exact alarms, notifications), target audience / Families
   policy (about children, for adults), subscription disclosure rules,
   Data Safety answers, content rating, ads, app access.
2. Privacy truthfulness: every network call and what leaves the device
   (Play Billing, in-app review, share sheet, mailto feedback, Android
   auto-backup). Do the privacy policy and terms match exactly? Recommend a
   decision on allowBackup.
3. Billing: purchase, acknowledgement, restore, cancel, lapse, refund,
   pending payments, grace period / account hold, offline launch, price
   display, manage-subscription link, free-tier enforcement and loopholes.
4. Android platform: edge-to-edge / safe-area insets on Android 15+,
   system bars, back button, keyboard, splash, adaptive icon, minSdk 24
   WebView compatibility, notification permission (13+), exact alarms
   (14+), release build settings (debuggable, minify, versionCode).
5. Data safety over time: migrations and the sealed-migration test, backup
   export/import validation, share-code robustness (malformed or huge
   input), what survives updates, reinstall and "delete all data".
6. Correctness: dates, time zones, DST, weekdays-only holidays, the
   08:00–18:00 coverage rule, limits, reminders.
7. Accessibility: contrast both themes, touch targets >= 48dp, screen
   reader labels, large font sizes, colour not the only signal.
8. Security & dependencies: input validation, no secrets in the repo,
   npm audit, third-party licences, WebView settings.
9. UX & polish: first-run flow, empty states, errors, copy consistency.
10. Release readiness: everything outstanding before internal testing,
    closed testing (12 testers x 14 days) and production.

OUTPUT
One report: BLOCKERS / SHOULD FIX before public release / NICE TO HAVE /
NEEDS A REAL PHONE OR PLAY CONSOLE. Each finding: what, where (file:line),
evidence, why it matters, the exact fix. End with a numbered,
one-step-at-a-time plan for the owner (Windows Command Prompt, Android
Studio, Samsung SM-A346B on USB).
```
