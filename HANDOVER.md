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
- 270 tests pass; `npm run lint` and `npm run build` clean (as of this file).

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
- **Suspected, needs checking:** on Android 15+ (targetSdk 36 forces
  edge-to-edge) the app's bottom navigation may sit under the system
  navigation bar — the CSS uses `env(safe-area-inset-*)`, while Capacitor 8
  injects `--safe-area-inset-*` variables. Reminders may need attention for
  the Android 13 notification permission and Android 14 exact-alarm rules.

## Waiting on the owner (outside the code)

- [ ] Google Play Console developer account (personal) and ID check.
- [ ] Upload latest `privacy.html` / `terms.html` (26 Sep 2026) to
      `t80.dev/kidrota/` and confirm both load.
- [ ] Email forwarding for `kidrota@t80.dev`.
- [ ] Create the **upload key** (`C:\Users\robta\KidRota-keys\kidrota-upload.jks`,
      alias `upload`) and the first signed `app-release.aab`; back up the
      key and passwords. Steps: "Next steps" 2 below, and "Signing" in README.
- [ ] Recruit **12+ testers** (Android + Gmail) for the mandatory 14-day
      closed test; add them as licence testers so Pro is free for them.
- [ ] Optional: a 30–60 s screen recording for a YouTube promo video.

## Open decisions

1. **Android auto-backup** (`android:allowBackup="true"`): it copies app
   data to the user's own Google Drive and is how old data came back after
   a reinstall. Keep it and add a sentence to the privacy policy, or turn it
   off (KidRota has its own Export backup). Must be settled before the Play
   Data Safety form.
2. Remove the **Contact support** row now that Settings has **Send
   feedback**? (Suggested, not answered.)
3. The import box still says "Paste the whole message — KidRota finds the
   plan in it", while shared messages now say "paste the text below". Align
   the wording? (Asked, not answered.)

## Next steps, in order

1. **Pre-release review** in a fresh session on the most capable model —
   see the prompt below. Report first; fix only after the owner approves.
2. Upload key + signed `.aab` (Android Studio → Build → Generate Signed App
   Bundle → Android App Bundle → Create new key store → release).
3. Play Console: create the app ("KidRota School Holiday Planner", English
   UK, App, Free), complete the app-content forms (privacy URL, data
   safety, target audience 18+, content rating, ads: none, app access).
4. Internal testing release (accept Play App Signing, release name 1.0.0);
   install from Play on the phone (uninstall the Android Studio build first
   — different signature).
5. Create the `kidrota_pro_yearly` subscription (yearly base plan, £1.99),
   add licence testers, test purchase / restore / cancel.
6. Store listing: short and full description, screenshots, feature graphic
   (1024×500), icon `design/icon/play-store-icon-512.png`.
7. Closed test with 12+ testers for 14 days, then apply for production.

## Pre-release review prompt

Paste into a new session (most capable model, highest effort):

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
