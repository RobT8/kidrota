# KidRota — handover

Where the project stands, for anyone (person or AI session) picking it up.
`README.md` is the reference for how the app works and why; this file is
the *state of play*: what is done, what is unproven, what is still open.
Keep it current — update it at the end of every working session.

**Last updated:** 27 September 2026
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

## What the app is today (version 1.0.0)

Local-first Android app (Capacitor 8 + React 19 + SQLite, no server, no
accounts). Plan childcare across school holidays, AM/PM or timed sessions,
gaps shown in red, share plans as a pasteable code, backup/restore,
reminders, feedback by email.

- **Free:** 1 child, 1 holiday *ever* (deleting it does not free the slot;
  a finished holiday's dates lock). **Pro:** £1.99/year auto-renewing
  subscription `kidrota_pro_yearly` — unlimited children and holidays,
  custom carer colours. No lifetime option.
- Detailed-mode day runs 08:00–18:00; a day is "covered" only with no gaps.
- Legal pages: `https://t80.dev/kidrota/privacy.html` and `terms.html`
  (source in `docs/`, dated 26 September 2026). Contact `kidrota@t80.dev`.
- Icon "AB1" (calendar + grown-up + child); source `design/icon/`.
- 325 tests pass; `npm run lint` and `npm run build` clean (as of this file).
- **Pre-release review done 27 Sep 2026 — `PRE-RELEASE-REVIEW.md`.** The
  owner approved B1-B2 and S1-S12 (keep `allowBackup` on); all are fixed and
  listed in the report's "Fix status" table. The N-list (nice to have) is
  not done.
- Reminders default **Off**; every holiday is at most **10 weeks**
  (`MAX_HOLIDAY_DAYS`); backup restore and plan import are validated and
  all-or-nothing; restore asks for confirmation.

## Verified on the phone vs not

See the README's **Tested on hardware** table for the detail. In short:

- ✓ Billing connects to Play, free-tier limits, Rate-this-app link, share
  sheet, backup export, database survives uninstall + reinstall, new icon.
- **Fixed but not re-confirmed on the phone:** backup *restore*; navigation
  buttons readable over white sheets; splash screen; typing in the plan-code
  box; the full import of a pasted WhatsApp message; Settings showing
  version 1.0.0 (first build since `build.gradle` reads `package.json`).
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
| 🟠 S2 | Share codes not validated (bad carer type breaks Carers screen) | `utils/shareCode.ts:159` |
| 🟠 S3 | One free holiday can span a whole year | `components/HolidayForm.tsx:41` |
| 🟠 S4-S12 | Reminder default, policy gaps, pending purchase msg, mode switch, share-cancel error, 48 dp targets, one contrast fail, licences page, README | see report |

Verified good: Billing Library 9.0.0, acknowledgement, lapse/refund
handling, 16 KB-aligned native libs, release WebView debugging off, no
secrets in git, contrast elsewhere in both themes, 200 % font layout.

## Waiting on the owner (outside the code)

- [ ] Google Play Console developer account (personal) and ID check.
- [ ] Upload `privacy.html`, `terms.html`, `licenses.html` and `index.html`
      (all updated 27 Sep 2026) to `t80.dev/kidrota/` and confirm they load
      (not reachable from the review environment, so still unverified).
- [ ] Play **payments profile** (needed to sell the subscription) and the
      trader-address decision.
- [ ] Email forwarding for `kidrota@t80.dev`.
- [ ] Create the **upload key** (`C:\Users\robta\KidRota-keys\kidrota-upload.jks`,
      alias `upload`) and the first signed `app-release.aab`; back up the
      key and passwords. Steps: "Next steps" 2 below, and "Signing" in README.
- [ ] Recruit **12+ testers** (Android + Gmail) for the mandatory 14-day
      closed test; add them as licence testers so Pro is free for them.
- [ ] Optional: a 30–60 s screen recording for a YouTube promo video.

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

1. ~~Pre-release review~~ and ~~fixes B1-B2, S1-S12~~ — done. **Next: the
   owner re-tests on the phone** (report Part B, steps 3-15), especially
   reminders (P3), backup restore (P4) and the merged manifest (P1), and
   uploads `privacy.html`, `terms.html` **and the new `licenses.html`**.
2. Upload key + signed `.aab` (Android Studio → Build → Generate Signed App
   Bundle → Android App Bundle → Create new key store → release).
3. Play Console: create the app ("KidRota School Holiday Planner", English
   UK, App, Free), complete the app-content forms (privacy URL, data
   safety, target audience 18+, content rating, ads: none, app access).
4. Internal testing release (accept Play App Signing, release name 1.0.0);
   install from Play on the phone (uninstall the Android Studio build first
   — different signature).
5. Set up the Play **payments profile**, then create the
   `kidrota_pro_yearly` subscription (yearly base plan, £1.99), add licence
   testers, test purchase / restore / cancel (review P6-P10).
6. Store listing: short and full description, screenshots, feature graphic
   (1024×500), icon `design/icon/play-store-icon-512.png`.
7. Closed test with 12+ testers for 14 days, then apply for production.

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
