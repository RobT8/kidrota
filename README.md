# KidRota

A local-first Android app that helps working parents plan childcare cover across
school holidays. Every break, cover gets pieced together from grandparents,
holiday clubs, playdates and annual leave — KidRota makes that visual, so the
gaps are obvious at a glance.

**All data stays on the device.** No server, no accounts, no sync.

## Store listing

| Field | Value |
|---|---|
| Play title (30 char limit) | `KidRota School Holiday Planner` — exactly 30 |
| Package ID | `com.kidrota.app` — **permanent after first publish** |
| Privacy policy | https://t80.dev/kidrota/privacy.html |
| Terms | https://t80.dev/kidrota/terms.html |

The title drops a colon after the brand deliberately: `KidRota: School
Holiday Planner` is 31 characters and would be rejected.

## Tech stack

| Piece | Choice |
|---|---|
| Native shell | Capacitor 8 (Android, minSdk 24 / Android 7.0+) |
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | React Router (hash routing, for the WebView) |
| Storage | SQLite via `@capacitor-community/sqlite` |
| Plugins | Local Notifications, Share, Filesystem, In-App Review, Play Billing (`capacitor-plugin-cdv-purchase`) |

## Getting started

```bash
npm install
npm run dev            # web dev server, fastest loop for UI work
npm test               # data-layer tests
npm run lint
```

In the browser the database runs on jeep-sqlite (SQLite compiled to wasm),
stored in IndexedDB. On Android the native plugin is used instead and none of
that code loads. `sql.js` is pinned to an exact version because jeep-sqlite
inlines its own copy of the sql.js glue and a newer wasm fails to link against
it — see the comment in `vite.config.ts` before bumping it.

## Running on Android

```bash
npm run build          # produces dist/
npx cap sync android   # copies dist/ into the native project, updates plugins
npx cap open android   # opens Android Studio
```

`npx cap sync` must be re-run after every web build and after adding any
Capacitor plugin. Requires Android Studio and a JDK locally.

## Project structure

```
src/
├── db/          SQLite init, migrations, CRUD per table
├── hooks/       Data hooks (holidays, children, carers, assignments)
├── screens/     One file per screen
├── components/  Shared UI (grid cells, pickers, progress bars, nav)
├── utils/       Dates, sharing, theme, constants
└── styles/      Global CSS and design tokens
```

## Data layer

`src/db/` is plain SQL behind a small `DbExecutor` interface, so the same code
runs three ways: the Capacitor plugin on Android, jeep-sqlite in the browser,
and Node's built-in SQLite under test. Tests therefore exercise the real
schema and the real queries.

Day notes live in their own table rather than on assignment rows: a note like
"pack swimming kit" describes the day, so storing it per assignment would
duplicate it across slots and lose it on a day with no cover booked.

Migrations live in `src/db/schema.ts` and are tracked with SQLite's
`user_version`. A shipped migration is never edited — add a new one to the end
of the array instead.

Assignments carry two shapes in one table: simple-mode rows set `period`
('am' / 'pm' / 'all_day') and leave the times null, while detailed-mode rows
set `start_time`/`end_time` and leave `period` null. A partial unique index
enforces one carer per simple-mode slot without restricting how many time
slots a detailed day can hold.

In detailed mode a child's day is a run of sessions — Dad 08:00–10:00, Gran
10:00–15:00, Mum 15:00–18:00. Adding one is "who, then when": the one-tap
times start where the day's last session ends, so a day of hand-overs only
needs the hand-over times typed. The day runs 08:00–18:00 (`DAY_START` /
`DAY_END` in `utils/timeSlots.ts`). Overlaps are warned about but allowed,
since an overlap at a hand-over can be deliberate.

A detailed day counts as covered only when a child's sessions leave no gap
between 08:00 and 18:00 (`dayGaps` / `coversWholeDay`). Gaps show as a red "?"
where they fall in the grid and list, the day's badge names the gap ("Gap
15:00–15:30"), and adding a session offers "Fill gap" first. A day with
sessions but a gap is a gap in the Home screen's totals, not "Not started".

## Theming

All colours are CSS custom properties in `src/styles/index.css`. The user's
preference (light / dark / system) is stored in `localStorage`;
`src/utils/theme.ts` resolves `system` against the OS and writes the concrete
theme to `data-theme` on `<html>`, keeping it in sync if the OS setting changes.

## Share codes

A whole holiday travels as one pasteable string, because there is no server
between the two parents. Children and carers become indices and dates become
day offsets from the holiday's start, and trailing nulls are trimmed from each
assignment — together that takes a planned fortnight for two children from
about 6KB of plain JSON to roughly 1KB, which is the difference between a code
that pastes into a message and one that does not.

A plan is sent from the holiday's Share button or Settings → "Send a plan to
someone". It travels as a message: instructions first (where to paste it),
then the code on its own line (`planMessage`). The recipient pastes the whole
message; `extractShareCode` finds the `KIDROTA1:` code inside it, so nothing
needs trimming by hand.

Importing a code *adds* to the device rather than replacing it, unlike a backup
restore: the code arrives while the recipient already has their own children
and carers set up. People are matched by name, case and spacing ignored, so an
import does not leave you with two of everyone.

## Backup files

`exportData` writes every table plus the app settings into one JSON file
stamped with the schema version. Import validates before touching anything —
a malformed file is rejected with nothing deleted — then replaces the device's
contents wholesale rather than merging, keeping row ids so assignments still
point at the right child and carer. A backup from a newer schema is refused;
one from an older schema is accepted, with tables added since defaulting to
empty.

On Android the file goes to app storage and then the system share sheet, so it
can be saved to Drive, Files or email. Writing straight to the public Downloads
folder would need storage permissions the app otherwise never asks for.

## Feedback

Settings → Send feedback is a short form (kind + message) that opens the
user's own email app with a message to `kidrota@t80.dev` filled in, including
the app version (`utils/feedback.ts`). The app sends nothing itself; the
privacy policy's "Sending feedback" section says what happens to the email.

The legal pages' source is `docs/`; they are served from
`https://t80.dev/kidrota/`. Google Play needs the privacy policy as a web
page, not a PDF.

## Android back button

A WebView wires nothing to Android's back button or back gesture, so without
`useAndroidBackButton` it closes the app from any screen. `handleBackPress`
decides what a press means: anything layered over a screen (a modal, a
confirmation) registers an interceptor and is dismissed first, otherwise it
navigates back, and only at the first screen does the app exit.

## KidRota Pro

| | Free | Pro |
|---|---|---|
| Children | 2 | Unlimited |
| Holidays at a time | 2 | Unlimited |
| Custom carer colours | — | ✓ |

Sold through Google Play Billing as either product below. The IDs must be
created in the Play Console exactly as written; prices are set there too, and
the app only ever shows the price Play reports in the buyer's own currency.

| Product | Play Console type | ID | Price |
|---|---|---|---|
| Lifetime | In-app product (one-time) | `kidrota_pro_lifetime` | £3.99 |
| Yearly | Subscription, one yearly auto-renewing base plan | `kidrota_pro_yearly` | £1.99 |

`utils/billing.ts` wraps `capacitor-plugin-cdv-purchase`, the Capacitor edition
of `cordova-plugin-purchase`. There is no receipt server, so an approved
purchase is finished (acknowledged to Play) on the phone straight away — an
unacknowledged purchase is refunded by Play after three days. The trade-off
is that a patched APK could fake Pro; for a £3.99 app that is accepted.

Whether Pro is unlocked is decided by `resolvePro` in `utils/freeTier.ts`:
until Play has loaded the account's purchases the last known answer stands, so
a paying user never flashes back to free on launch or offline; once loaded,
Play is the only authority, which is how a lapsed subscription or a refund
turns Pro off. That last answer is cached in `localStorage`, deliberately not
in `app_settings` — settings travel inside backup files, and a backup must not
carry Pro to another Google account.

The caps only stop new things being added (`utils/freeTier.ts`). Anything
already on the phone — from a backup restore, or from before Pro lapsed —
stays visible and editable. A plan code counts against the caps, because it
adds; a backup restore does not, because it brings back what was already
yours. When a cap is hit, the screen opens the upgrade sheet
(`components/ProSheet.tsx`) in place, with the reason.

In a browser there is no Play, so Pro is whatever `localStorage['kidrota.pro']`
says. Set it to `'1'` to work on the Pro side of the UI.

## Review prompt

The Play In-App Review card is requested when a parent opens the weekly
planner on a holiday with every day covered — the moment the app has just
done its job. `utils/reviewPrompt.ts` holds the timing rule and is unit
tested: not in the first 3 days after first launch, at least 120 days between
asks, and at most 3 asks ever. Its state is one JSON value in `app_settings`
under `review_prompt`.

Play decides for itself whether the card actually appears. It shows nothing
for an app not installed from Play (so never for an Android Studio build), it
has its own quota, and it never says whether a review was left. An ask is
therefore counted as soon as it is made, never retried.

The "Rate this app" row in Settings opens the Play listing instead of calling
the API, because Google asks apps not to put the review API behind a button:
the button would sometimes do nothing at all. The listing returns "not found"
until the first publish.

## Colour tokens

`--text` and `--text2` carry content and meet WCAG AA in both themes.
`--text3` is decoration only — punctuation, "+" glyphs inside already-labelled
controls, the repeated app-name eyebrow — and sits below 4.5:1 on small text by
design. Anything a user needs to read uses `--text2`.

Colours that serve two roles need two tokens: `--red-text` is a foreground and
`--danger-bg`/`--danger-on` the destructive button, because a red that reads on
the page background is unreadable as a button fill once the theme flips.

## Tested on hardware

Native behaviour that a browser cannot show, checked on a Samsung SM-A346B
from an Android Studio build:

| Feature | Status |
|---|---|
| Play Billing connects (Restore purchases gets Play's answer) | ✓ |
| Free-tier limits and the Pro sheet | ✓ |
| "Rate this app" opens the Play Store app | ✓ |
| Share sheet for plan codes | ✓ |
| Android navigation buttons follow the app's theme (`SystemBars` in `utils/theme.ts`) | Fixed — re-test |
| Backup export to the share sheet | ✓ |
| Backup restore | Crashed with "Connection kidrota already exists"; fixed in `connect()` in `src/db/database.ts` — re-test |
| Reminder scheduled | ✓ — delivery at 9:00 not yet seen |
| A real purchase, the review card | Not testable until installed from a Play testing track |

## Build progress

- [x] 1. Project scaffold — Vite + React + Capacitor + Android platform
- [x] 2. Database layer — SQLite init, migrations, CRUD
- [x] 3. Onboarding — welcome page, add children, add carers
- [x] 4. Home screen — holiday list, progress bars, stat cards
- [x] 5. Weekly planner — week grid, navigation, gap detection
- [x] 6. Day assignment — carer picker, slot assignment, repeat logic
- [x] 7. Children & Carers screens — full CRUD
- [x] 8. Settings — theme, backup/restore, delete all data
- [x] 9. Sharing — screenshot share, share code export/import
- [x] 10. Polish — animations, loading/empty states, error handling
