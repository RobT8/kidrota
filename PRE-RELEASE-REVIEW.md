# KidRota 1.0.0 — pre-release review

**Date:** 27 September 2026 · **Branch:** `claude/eloquent-brahmagupta-f1d5v1` @ `d0a016e`
**Scope:** everything in the brief (10 areas). **No app code was changed** — this is a report
for approval. The only files added are this report and an updated `HANDOVER.md`.

Every finding is tagged:

- ✅ **Verified** — I read the code / ran it / measured it here.
- 🟡 **Believed** — reasoned from docs or knowledge, not proven here.
- 📱 **Phone / Play Console only** — cannot be tested in this environment.

---

## At a glance

| | Count | Headline |
|---|---|---|
| 🔴 Blockers | 2 | Privacy wording contradicts Android auto-backup · reminders bounce users into a system settings page on Android 14+ |
| 🟠 Should fix before public release | 12 | Backup restore can wipe everything; share codes need validating; one free holiday can span a year; small tap targets |
| 🟢 Nice to have | 14 | Notification icon, themed icon, licences page, tidy-ups |
| 📱 Needs phone / Play Console | 13 checks | Merged manifest, real purchases, reminders firing, TalkBack, edge-to-edge |

**Build health (verified):**

| Command | Result |
|---|---|
| `npm test` | ✅ 20 files, **270 passed**, 0 failed. (Only noise: Node's "SQLite is an experimental feature" warning.) |
| `npm test` under `TZ=Europe/London`, `America/Los_Angeles`, `Pacific/Auckland`, `Pacific/Kiritimati`, `America/Sao_Paulo` | ✅ 270 passed in every zone |
| `npm run lint` (oxlint) | ✅ exit 0, no findings |
| `npm run build` | ✅ built in ~0.5 s. Two harmless warnings: `Module "crypto" has been externalized for browser compatibility` (jeep-sqlite, browser-only) and two `[INEFFECTIVE_DYNAMIC_IMPORT]` notes for `src/db/settings.ts` / `src/db/holidays.ts` |
| `npm audit` | 3 moderate — all one chain: `@capacitor/cli` → `xcode` → `uuid <11.1.1` (GHSA-w5hq-g745-h8pq). Build-time, iOS-only tooling; **not shipped in the APK**. See N11. |

**Things that are in good shape (verified):** Play Billing Library **9.0.0** (meets the 2026 minimum);
purchases are acknowledged via `finish()`; pending purchases never unlock Pro; a lapsed/refunded
subscription drops out of Play's purchase list and turns Pro off; `receiptsReady` fires even with
zero purchases, so the cached "Pro" answer is always replaced once Play answers. SQLCipher's native
libraries are **16 KB-page aligned** (`0x4000` on all four ABIs) as Play requires for Android 15+
targets. `targetSdk 36`, `minSdk 24`, `versionCode` 10000 from `package.json`. WebView debugging is
off in release builds (Capacitor ties it to `FLAG_DEBUGGABLE`). No secrets, keystores or
`google-services.json` anywhere in git history. Back button uses `OnBackPressedDispatcher`, which
keeps working with Android 16's predictive back. Colour contrast is clean in both themes except one
label (S10). Layout survives a simulated 200 % font size with no page overflow.

---

## 🔴 BLOCKERS

### B1. Privacy policy, terms and welcome screen contradict Android auto-backup — decide `allowBackup`

- **Where:** `android/app/src/main/AndroidManifest.xml:5` (`android:allowBackup="true"`);
  `docs/privacy.html:53-54` ("not uploaded, synchronised or backed up to us or to anyone else, and
  no part of it is transmitted off your phone"); `docs/privacy.html:123` ("Uninstall — removing
  the app removes its database with it"); `docs/terms.html:54-55` ("uninstall the app, your plans
  are gone"); `src/screens/onboarding/Welcome.tsx:15` ("Everything stays on your phone").
- **Evidence ✅:** the manifest enables backup with no rules, so Android's Auto Backup copies the
  whole app data folder (SQLite database + WebView storage) to the user's Google Drive backup. The
  HANDOVER already records that old plans came back after a reinstall — that *was* auto-backup.
- **Why it matters:** the privacy policy must be accurate for Play, and it's the page parents will
  trust. Today it says two things that are false while backup is on.
- **Recommendation: keep backup ON, fix the words.** For a local-first app with no accounts,
  Android's backup is the only thing that saves a parent's plans when they change phones. The data
  goes to *their own* Google account (end-to-end encrypted with their screen lock on Android 9+),
  never to you. 🟡 Google's Data safety guidance treats Android's backup service as not "collected"
  by the developer, so it doesn't change the Data safety answers.
- **Exact fix:**
  1. `docs/privacy.html` — replace the sentence at line 53-54 with:
     *"This information stays on your device. It is never sent to us. If Android backup is switched
     on for your Google account, Android includes KidRota's data in your phone's own backup, as it
     does for most apps; that backup is held by Google in your account and we cannot see it. You
     can turn it off in your phone's Settings → Google → Backup."*
  2. `docs/privacy.html:123` → *"Uninstall — removes the app and its data from this phone (a copy
     may remain in your phone's Android backup, if that is switched on)."*
  3. `docs/terms.html:54-55` → *"…your plans may be lost unless your phone's Android backup is on
     or you have exported a backup"*.
  4. `Welcome.tsx:15` → *"No sign-up, no servers. Your plans stay on your phone."*
  5. Bump both pages' "Last updated" date; re-upload to t80.dev.
  6. Optional hardening (N-list): add `android:dataExtractionRules`/`android:fullBackupContent`
     that explicitly include the database and shared prefs.
  - If you would rather turn it **off**: set `android:allowBackup="false"` and keep the current
    wording — but then every phone change loses all plans unless the parent exported a backup.

### B2. Turning on reminders sends Android 14+ users to the "Alarms & reminders" system page — every time a holiday is saved

- **Where:** `src/utils/notifications.ts:62-70` (schedule call with no `isExactNotification`);
  plugin `@capacitor/local-notifications` 8.3.1 `LocalNotificationsPlugin.kt:103-131`; merged
  permission `SCHEDULE_EXACT_ALARM` from the plugin's `AndroidManifest.xml`.
- **Evidence ✅ (plugin source):** `isExactNotification` defaults to **true**. When exact alarms
  aren't allowed — the default for new installs on Android 14+ — `schedule()` launches
  `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` (the system "Alarms & reminders" screen) before scheduling.
  `syncReminders()` runs after every holiday add/edit/delete (`src/hooks/useHolidays.ts:79,89,99`),
  so once reminders are on, *every holiday save* can bounce the user out of the app to that screen.
- **Why it matters:** a confusing, unexplained jump to system settings is exactly the kind of thing
  testers report and reviewers flag. A 9:00 "holiday starts in 7 days" nudge doesn't need
  to-the-second timing.
- **Exact fix:**
  1. In `notifications.ts`, schedule with
     `schedule: { at: item.at, allowWhileIdle: true }, isExactNotification: false`.
     (Plugin path then uses `setAndAllowWhileIdle(RTC_WAKEUP)` — fires within minutes, even in Doze.)
  2. Remove the now-unused permission from the merged manifest — add
     `xmlns:tools="http://schemas.android.com/tools"` to `<manifest>` and
     `<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />`.
     This also removes any exact-alarm questions from Play review.
  3. 📱 Re-test on the Samsung: turn reminders on, add a holiday, confirm no settings page appears.

---

## 🟠 SHOULD FIX before public release

### S1. A backup with one bad row wipes the phone, and restore never asks "are you sure?"

- **Where:** `src/db/backup.ts:185-215` (validation checks only that the arrays exist),
  `src/db/backup.ts:234-238` (wipes first, then inserts row by row, no transaction);
  `src/screens/SettingsScreen.tsx:115-141` and `:309-320` (file chosen → replaced immediately).
- **Evidence ✅ (probe test, run and deleted):** a backup whose one assignment points at a
  missing carer failed with `FOREIGN KEY constraint failed` *after* the wipe — settings (including
  `onboarding_complete`) were gone. A backup with one child whose name is `null` failed with
  `NOT NULL constraint failed: children.name` and left **0 carers, 0 holidays**. The README (line
  136) promises "a malformed file is rejected with nothing deleted"; that's only true for the
  top-level shape.
- **Analogy:** it empties the fridge first, then checks whether the shopping bag has a hole in it.
- **Exact fix:** (a) validate every row's types/enums/dates/foreign keys *before* touching the
  database; (b) run wipe + inserts inside one transaction (`BEGIN` … `COMMIT`, `ROLLBACK` on any
  error) — add `transaction(fn)` to `DbExecutor` (Capacitor: `conn.beginTransaction()` /
  `commitTransaction()` / `rollbackTransaction()`; tests: `BEGIN`/`COMMIT` on node:sqlite); (c) show
  a `ConfirmDialog` after the file is read: *"Replace everything on this phone with the backup from
  3 Sep 2026 (2 children, 4 holidays)?"*; (d) add tests for both probe cases.

### S2. Share codes are trusted input but barely validated

- **Where:** `src/utils/shareCode.ts:159-222`; `src/db/importPlan.ts:249-348`;
  `src/db/carers.ts:27`; `src/components/ChildAvatar.tsx:18`.
- **Evidence ✅ (probe):**
  - carer type `"hacker"` imports fine, then `listCarersByType` throws
    `Cannot read properties of undefined (reading 'push')` → the Carers screen breaks for good;
  - child colour `url(https://example.invalid/x)` is stored and later used as a CSS `background`,
    which makes the WebView fetch that URL (a stranger's code could learn your IP) — breaks the
    "nothing leaves the phone" promise;
  - a numeric carer name throws `name.trim is not a function` **after** one child was already
    created (partial import);
  - `"n": "notarray"` throws a raw `TypeError` (shown as "That code could not be read.");
  - start date `"garbage"` and mode `"weird"` are accepted; a 1900-2999 range decodes to
    401,767 days.
  - ✅ Robust: a 10 MB paste is rejected cleanly in ~0.5 s.
- **Why it matters:** codes arrive from other people's phones via WhatsApp; a damaged or
  hand-edited code must never break the app or leak a network request.
- **Exact fix:** in `decodePlan`, check every field and throw `ShareCodeError` on failure: strings
  for names (trim, ≤40 chars), `/^#[0-9a-f]{6}$/i` for colours, ISO dates that round-trip, `end ≥
  start`, length ≤ the holiday cap (S3), mode ∈ {simple, detailed}, carer type ∈ the five types,
  period ∈ {am, pm} (and times via `isTime`), finite numbers for cost, offsets inside the holiday,
  `n` an array; cap counts (e.g. ≤20 children, ≤50 carers, ≤2,000 assignments). Run
  `importSharedPlan` in the same transaction helper as S1. Also validate `colour` against the hex
  pattern in `ChildAvatar`/`carerSwatch` as a last line of defence.

### S3. Free-tier loophole: the one free holiday can be as long as you like

- **Where:** `src/components/HolidayForm.tsx:41-50` (no maximum length);
  `src/utils/freeTier.ts:37` (dates editable until the end date passes).
- **Evidence ✅:** nothing stops a free user from making one holiday "1 Sep 2026 – 31 Aug 2027"
  and planning every break inside it; or re-dating an unfinished holiday to the next break on its
  last day, indefinitely.
- **Exact fix:** cap a holiday at, say, **70 days** for everyone (the longest UK summer break is
  ~7 weeks; this also protects the planner from 400,000-day ranges). Error copy: *"A holiday can be
  up to 10 weeks. Split a longer stretch into two holidays."* Consider also freezing dates on the
  free tier once the holiday has *started* (not just finished).

### S4. Reminders: the "7 days" default never applies, and a restore leaves stale reminders

- **Where:** `src/utils/notifications.ts:90-91` and `src/screens/SettingsScreen.tsx:59-61` —
  `Number(null)` is `0`, which passes the `>= 0` check. `handleImportFile` (`SettingsScreen.tsx:124-130`)
  never calls `syncReminders()`.
- **Evidence ✅:** in the browser the Reminders select flashes "7 days" then shows **Off** on a new
  install; `DEFAULT_REMINDER_DAYS = 7` is effectively dead code. After a restore, old notifications
  (keyed by holiday id) stay scheduled until some holiday is edited.
- **Exact fix:** decide the default. **Recommendation: keep reminders Off by default** (no surprise
  permission prompt during first use) — set `DEFAULT_REMINDER_DAYS = 0` or treat `null` explicitly.
  Call `syncReminders()` after a successful restore (before the reload) and once at launch.

### S5. Privacy policy is incomplete (beyond B1)

- **Where:** `docs/privacy.html:78-100`.
- **Evidence ✅:** it covers backup-file sharing but not **sending a plan** (Share button / Settings
  → "Send a plan") — which puts children's and carers' names into WhatsApp/email at the user's
  choice — nor the **picture of the week** share, nor Play's **in-app review** card. The heading
  "Permissions the app uses" lists only Notifications, while the merged manifest also has Internet,
  Billing, boot/wake-lock (for reminders), etc.
- **Exact fix:** add a "Sending a plan or a picture" subsection mirroring "Sharing a backup file";
  one sentence under "Google Play" for the review card ("Google shows it; we're told nothing");
  retitle "Permissions" to *"Permissions you may be asked for"* and add *"The app also declares
  standard permissions that you are not asked about — for Google Play purchases and for reminders to
  survive a restart."*

### S6. Billing: no feedback for pending payments, and no refresh when returning to the app

- **Where:** `src/components/ProSheet.tsx:30-38`, `src/utils/billing.ts:159-160`.
- **Evidence ✅:** for a pending payment (e.g. cash at a shop), `order()` returns no error → the
  sheet stays on "Subscribe" with no message. Purchases are only re-read at launch, so cancelling
  or re-subscribing in the Play Store isn't reflected until the app is restarted.
- **Exact fix:** listen for `.pending()` (or check the transaction state) and show *"Payment
  pending — Pro unlocks as soon as Google Play confirms it."*; on `App` `resume`, call
  `store.update()` (cheap; reads Play's local cache).

### S7. Changing a holiday between "Morning / afternoon" and "Set times" silently hides its plan

- **Where:** `src/components/HolidayForm.tsx:118-137`; coverage and planner filter by mode.
- **Evidence ✅:** assignments of the other mode stay in the database but are ignored by
  `src/db/coverage.ts` and every view — the plan appears to vanish (switching back restores it).
- **Exact fix:** when editing a holiday that has any assignments, confirm the switch: *"Switching to
  set times hides the morning/afternoon plan for this holiday. Switch back any time to see it
  again."*

### S8. Backing out of the share sheet shows a red error

- **Where:** `src/screens/SettingsScreen.tsx:108-109`; `src/screens/WeeklyPlannerScreen.tsx:107-108, 123-124`.
- **Evidence ✅ (plugin source):** `@capacitor/share` rejects with `"Share canceled"` when the
  sheet is dismissed → *"Export failed: Share canceled"*. 📱 Confirm on the phone.
- **Exact fix:** treat that message as a quiet no-op (`if (/cancel/i.test(message)) return;`).

### S9. Touch targets under 48 dp (Play's pre-launch report flags these)

- **Evidence ✅ (Playwright, 412 × 892, both themes):**

  | Control | Size (dp) | Where |
  |---|---|---|
  | Move child up / down | **17 × 26** | Children screen |
  | "Clear" in paste box | **39 × 18** | Settings → Add a plan |
  | Edit (holiday card, child, carer) | 37 × 29 | Home, Children, Carers |
  | Modal "Close" | 47 × 29 | every sheet |
  | Theme Light/Dark/System | ~48 × 31 | Settings |
  | Reminder select | 84 × 33 | Settings |
  | "+" add button (FAB) | 38 × 38 | Home, Children, Carers |
  | Week-grid slots | 73 × 38 | Planner (week) |
  | Share, Week/List, chips, Restore purchases | 34-40 high | Planner, Day, Pro sheet |
  | Back arrow | 44 × 44 | Planner, Day |

- **Exact fix:** in `src/styles/index.css`, give `.icon-button, .fab, .back-button,
  .segmented__option, .share-button, .chip, .link-button, .setting-row__control, .slot` a
  `min-height: 48px` (and `min-width: 48px` for icon-only ones). Where the visual should stay small,
  keep it small and enlarge the hit area with padding or a `::before` inset.

### S10. One text colour fails WCAG AA

- **Where:** `src/styles/index.css:979-983` (`.slot__period`: 9 px at `opacity: 0.75`).
- **Evidence ✅:** "AM"/"PM" on a booked slot measures **4.43 : 1** (light) and **4.32-4.39 : 1**
  (dark) against a required 4.5. Everything else that people need to read passes in both themes.
  (Below-4.5 items that are decorative by design: the "KIDROTA" eyebrow 3.2 : 1 in light, the "+" in
  "Other" 3.2 : 1, Settings chevrons 3.49 : 1 in dark — all fine as decoration/non-text ≥ 3 : 1.)
- **Exact fix:** drop the opacity and raise to 10-11 px.

### S11. Open-source licence notices aren't shipped

- **Evidence ✅:** the production bundle contains no licence text (0 `Copyright` strings in
  `dist/assets`). MIT/Apache/BSD require the notice to travel with the app; the native side ships
  SQLCipher Community Edition (BSD-style, attribution required), AndroidX (Apache-2.0).
- **Exact fix:** add `docs/licenses.html` (served at t80.dev/kidrota/licenses.html) listing React,
  React Router, Capacitor + plugins, cordova-plugin-purchase, html-to-image, SQLCipher, AndroidX;
  add an "Open-source licences" row under Settings → About.

### S12. README promise about backups is inaccurate

- **Where:** `README.md:136`. Fix together with S1 so the sentence becomes true.

---

## 🟢 NICE TO HAVE

| # | What | Where | Fix |
|---|---|---|---|
| N1 | Reminder uses Android's generic "ⓘ" status-bar icon; channel is called **"Default"** in system settings ✅ | plugin `LocalNotificationManager.kt:83,498` | Add a white-on-transparent `res/drawable/ic_stat_kidrota.xml`, set `plugins.LocalNotifications.smallIcon` + `iconColor: '#185FA5'` in `capacitor.config.ts`; create a "Holiday reminders" channel with `LocalNotifications.createChannel` and pass `channelId` |
| N2 | No monochrome layer → no Android 13+ themed icon ✅ | `mipmap-anydpi-v26/ic_launcher.xml` | Add `<monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>` (generate from `design/icon`) |
| N3 | `INTERNET` permission isn't needed by any feature 🟡 (Billing and review talk to the Play Store app; links open other apps) | `AndroidManifest.xml:40` | Remove it to make "nothing leaves the phone" technically enforced. 📱 Must re-test billing + review from a Play build before shipping |
| N4 | FileProvider exposes `external-path "."` ✅ | `res/xml/file_paths.xml:3` | Keep only `<cache-path name="my_cache_images" path="." />` (backups/images are written to Cache) |
| N5 | "Contact support" duplicates "Send feedback" (open decision 2) | `SettingsScreen.tsx:411-414` | **Recommend removing** "Contact support"; the feedback form already shows the address |
| N6 | Wording "code" vs "message" (open decision 3) | `SettingsScreen.tsx:358` vs modal label | **Recommend "message" everywhere:** row subtitle → *"Paste the message they sent — it adds to your plans"* |
| N7 | "Restored 1 children and 1 holidays" ✅ | `SettingsScreen.tsx:127` | Use `plural()` |
| N8 | "Delete all data" doesn't mention the subscription, and doesn't `VACUUM` | `SettingsScreen.tsx:224-231`, `backup.ts:218-226` | Add *"This doesn't cancel KidRota Pro — manage that in Google Play."*; run `VACUUM` after the wipe |
| N9 | Colour swatches read out as "Colour #378ADD" to TalkBack ✅ | `ChildForm.tsx`, `ChildrenStep.tsx:164`, `CarerForm.tsx` | Name them ("Blue", "Coral", …) |
| N10 | Migrations aren't atomic: script and `PRAGMA user_version` run separately ✅ (v1/v2 are `IF NOT EXISTS`, so safe today) | `src/db/migrate.ts:126-130` | Before the first `ALTER TABLE` migration, run `BEGIN; <migration>; PRAGMA user_version = N; COMMIT;` as one script with `conn.execute(sql, false)` |
| N11 | `@capacitor/cli` is a runtime dependency | `package.json:19` | Move to `devDependencies` (it's also the source of all 3 audit warnings) |
| N12 | Root back press calls `App.exitApp()` 🟡 | `useBackButton.ts:20` | `App.minimizeApp()` keeps state and plays Android 16's back-to-home animation |
| N13 | Out-of-date comment says detailed days need "at least one time slot" | `src/db/coverage.ts:35-36` | Update to the 08:00-18:00 no-gap rule |
| N14 | Week header clips "Fri 23" at 200 % font (simulated) | Planner week header | Allow the header to wrap or shorten to "F 23" at large sizes |

Also noted, no action needed: SQLCipher (~several MB per ABI, split per device by the App Bundle)
and the browser-only jeep-sqlite chunk (292 KB) ship unused — acceptable; `minifyEnabled false` is
the safe choice for Capacitor (R8 can strip plugin classes); Play may warn about missing native
debug symbols for SQLCipher's prebuilt `.so` — ignore it. `user-scalable=no` in `index.html:8`
has no effect inside the Android WebView (Capacitor turns zoom off anyway).

---

## 📱 NEEDS A REAL PHONE OR PLAY CONSOLE

| # | Check | What "pass" looks like |
|---|---|---|
| P1 | **Merged manifest** (Android Studio → open `app/src/main/AndroidManifest.xml` → *Merged Manifest* tab). ✅ from plugin sources: `INTERNET`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `com.android.vending.BILLING`. 🟡 Likely also from Google/AndroidX libraries (couldn't download them — Google Maven is blocked here): `USE_BIOMETRIC`, `USE_FINGERPRINT` (androidx.biometric, pulled in by the SQLite plugin), `ACCESS_NETWORK_STATE`, `…DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, and **no** `AD_ID` | Send me a screenshot of the permissions section |
| P2 | Edge-to-edge on Android 15/16 — 🟡 believed fine: Capacitor 8 either pads the window natively (WebView < 140) or passes real insets to CSS `env(safe-area-inset-*)`, which `index.css:100-101` and `.modal__sheet` use. The HANDOVER worry about `--safe-area-inset-*` doesn't apply | Bottom nav fully above the gesture bar and 3-button bar, both themes, portrait; sheets' buttons above the nav bar; typing in a sheet keeps the field visible |
| P3 | Reminders (after B2): enable 1 day, create a holiday starting the day after tomorrow | Notification arrives ~09:00 tomorrow, no settings page appeared, correct icon (after N1) |
| P4 | Backup restore (after S1) and restore of a *damaged* file | Good file restores; damaged file leaves everything intact |
| P5 | Auto-backup round-trip: `adb shell bmgr backupnow com.kidrota.app`, uninstall, reinstall | Plans return; app opens without the "CapacitorSQLitePlugin: null" error |
| P6 | Real purchase with a licence tester | Pro unlocks; Play shows it acknowledged (not auto-refunded after 3 days) |
| P7 | "Slow test card, approves after a few minutes" | Message about pending (after S6); Pro unlocks when approved |
| P8 | Cancel in Play → still Pro until period end; test subscriptions renew/expire fast (yearly = 30 min for testers) | Pro turns off after expiry, plans stay usable |
| P9 | Refund/revoke from Play Console → Order management | Pro off on next launch |
| P10 | "Slow test card, declines after a few minutes" → grace period / account hold | Pro kept in grace, removed in hold |
| P11 | In-app review card after a fully covered holiday (Play-installed build only) | Card may or may not show — Play decides; app never breaks |
| P12 | Feedback → "Open email" | Gmail opens pre-filled |
| P13 | TalkBack pass + Samsung font size at max | Every control is announced sensibly; nothing clipped |

---

## Play Console answers (recommended)

| Form | Answer | Confidence |
|---|---|---|
| **Privacy policy** | `https://t80.dev/kidrota/privacy.html` (after B1/S5 update, uploaded) | ✅ |
| **App access** | All functionality available without special access (no login) | ✅ |
| **Ads** | No, the app has no ads | ✅ |
| **Content rating (IARC)** | Category *Utility / Productivity*; no violence, sex, language, drugs, gambling; users **don't** interact or exchange content inside the app (sharing leaves via other apps); no location sharing; **Yes** to digital purchases. Expect PEGI 3 / Everyone | 🟡 |
| **Target audience** | **18 and over only.** "Could the app unintentionally appeal to children?" → **No** (it's a scheduling tool for parents; the icon shows an adult with a child). Do **not** tick any under-13 age group, or the Families policy applies | 🟡 |
| **Data safety** | "Does your app collect or share any of the required user data types?" → **No.** Rationale: the app transmits nothing off the device; feedback is an email the user sends from their own email app; payments are handled by Google Play; Android backup is Google's service in the user's account. Encryption/deletion questions then don't apply | 🟡 (Google defines "collected" as *transmitted off the device by your app*) |
| **Advertising ID** | No | ✅ (no AD_ID permission declared by app or plugins) |
| **Government / financial / health / news** | No / none / no / no | ✅ |
| **Exact alarms** | Nothing to declare once B2 removes `SCHEDULE_EXACT_ALARM` | 🟡 |
| **Trader status (EU Digital Services Act)** | You sell a subscription, so you will have to declare yourself a **trader**; Play then shows your name, **address**, phone and email on the listing. Consider a virtual-office/PO box address before you fill this in | 🟡 — decide before submitting |
| **Payments profile** | Required before you can sell the subscription (Play Console → Setup → Payments profile) | 🟡 |

---

## One-step-at-a-time plan for the owner

*Windows Command Prompt, Android Studio, Samsung SM-A346B on USB. Do one line at a time.*

**Part A — approve the fixes (nothing to install yet)**

1. Read this report. Reply in chat with what to fix — the suggested reply is:
   *"Fix B1-B2 and S1-S12; also N1, N4, N5, N6, N7, N11. Keep allowBackup on."*
2. Wait for me to say the fixes are pushed and tests pass.

**Part B — get the fixed build onto your phone**

3. Open **Command Prompt**.
4. `cd C:\Users\robta\kidrota`
5. `git checkout claude/eloquent-brahmagupta-f1d5v1`
6. `git pull`
7. `npm install`
8. `npm test` — expect "270 passed" or more.
9. `npm run build`
10. `npx cap sync android`
11. In Android Studio: **File → Sync Project with Gradle Files**.
12. Open `app/src/main/AndroidManifest.xml`, click the **Merged Manifest** tab at the bottom, and send me a screenshot of the permission list (check P1).
13. Plug in the Samsung, press **Run ▶**.
14. On the phone: **Settings → Export a backup** and save it to Drive (your safety net for step 27).
15. Work through P2, P3, P4, P12 and P13 from the table above; tell me what you see.

**Part C — outside the code**

16. Upload the updated `docs/privacy.html`, `docs/terms.html` (and `docs/licenses.html`) to `t80.dev/kidrota/`.
17. On your phone, open both links and check the "Last updated" date is the new one.
18. Send an email to `kidrota@t80.dev` from another account and confirm it arrives.
19. Finish the Play Console developer account + identity verification.
20. Set up the **payments profile**, and decide the trader address (see table).

**Part D — first signed build**

21. Android Studio → **Build → Generate Signed App Bundle or APK → Android App Bundle → Next**.
22. **Create new…** key store at `C:\Users\robta\KidRota-keys\kidrota-upload.jks`, alias `upload`, strong passwords → save both in your password manager, then copy the `.jks` to a second safe place.
23. Choose **release**, **Create**. The file lands in `android\app\release\app-release.aab`.

**Part E — Play Console**

24. **Create app**: "KidRota School Holiday Planner", English (UK), App, Free.
25. **App content**: fill each form with the answers in the table above.
26. **Testing → Internal testing → Create release**: accept Play App Signing, upload the `.aab`, release name `1.0.0`, add yourself as tester, **Roll out**.
27. On the phone: uninstall the Android Studio build (different signature), open the internal-testing opt-in link, install from Play, restore your backup from step 14.
28. **Monetise → Subscriptions → Create**: ID `kidrota_pro_yearly`, one base plan, auto-renewing, yearly, £1.99, activate.
29. **Setup → License testing**: add your Gmail and every tester's Gmail.
30. Test P6-P11 on the phone.
31. **Store listing**: short + full description, 4-8 phone screenshots, feature graphic 1024 × 500, icon `design/icon/play-store-icon-512.png`.
32. **Closed testing**: create a track, add **15+** testers (margin over the 12 required), share the opt-in link; they must stay opted in for **14 days in a row**.
33. Collect feedback, fix, upload new versions (bump with `npm version patch --no-git-tag-version`).
34. **Apply for production** when Play Console unlocks it; use a **staged rollout** (e.g. 20 %).

---

## How this review was done

- Read every file under `src/`, the Android project, `capacitor.config.ts`, `docs/`, README and
  HANDOVER; read the Android/Kotlin/Java source and `AndroidManifest.xml` of every plugin in
  `node_modules` (`@capacitor/android` Bridge + SystemBars, `app`, `share`, `filesystem`,
  `local-notifications`, `@capacitor-community/sqlite`, `in-app-review`,
  `capacitor-plugin-cdv-purchase` Java + `www/store.js` Google Play adapter).
- Downloaded `sqlcipher-android-4.17.0.aar` from Maven Central and parsed each `.so`'s ELF
  `PT_LOAD` alignment. Google Maven (billing, biometric, review AARs) was blocked by this
  environment's network policy, and so was `t80.dev` — hence the 🟡/📱 tags on those.
- Drove the built app (`vite preview`) in Chromium via Playwright at 412 × 892 dp, light and dark:
  onboarding, Home, planner (week + list), day screen, Children, Carers, Settings, Pro sheet,
  paste-a-plan, feedback, free-tier block, delete-all confirmation. Contrast was computed from
  computed styles with alpha compositing (WCAG 2.x formula); targets from bounding boxes; font
  scaling simulated at 130 % and 200 %.
- Probe tests for backup/share-code robustness and DST were run under Vitest and then deleted; the
  working tree was clean afterwards.
