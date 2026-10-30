# KidRota — Apply for production (draft answers)

Draft answers for Play Console → **Dashboard → Apply for production**,
written 30 October 2026 after the 14-day closed test (Closed testing –
Alpha, version 1.0.1, versionCode 10001).

Copy each answer into the matching box. Anything in **[square brackets]**
is a fact only the owner knows — fill it in or delete it before pasting.
Keep the answers true: Google reads them, and vague or copied-looking
answers are the most common reason an application is turned down.

The form has three parts. Question wording below is as last seen; if
Play Console words a question differently, use the closest answer.

---

## Part 1 — About your closed test

### 1. How easy was it to recruit testers for your app?

Pick the option that is true for you. Suggested: **Difficult** — as a solo
developer without an existing user base, most testers came through a
testing service.

### 2. Describe the engagement you received from testers during your closed test.

> The closed test ran for 14 days with [number] testers opted in, from a
> testing service plus friends and family on my own list. Testers installed
> the app from Play, set up children and carers, created a school holiday
> and planned sessions across the week, including copying sessions to other
> days and sharing the week as a picture. The testing service gave me a
> written report on 25 October, which found no crashes or bugs. [Check
> Play Console → Android vitals; if it shows no crashes or ANRs, say so.] [Add anything you saw yourself, e.g. how many testers
> used it on several days.]

### 3. Provide a summary of the feedback you received from testers. Include how you collected it.

> Feedback came in two ways: a written report from the testing service, and
> direct messages and the in-app feedback option (which opens email) from
> testers I know. The report found no crashes or bugs. Its suggestions were
> that new users would benefit from a short "How it works" page, and that
> the welcome page should say clearly that everything stays on the phone
> with no account. Testers also said the store listing should explain more
> clearly what the app does, so I rewrote it. Before the closed test, my own
> internal testing produced 18 changes, which went into version 1.0.1.

## Part 2 — About your app

### 4. Who is the intended audience of your app?

> Parents and guardians (18+) who need to organise childcare during school
> holidays, especially families where several people share the care:
> parents, grandparents, holiday clubs, childminders and friends. The app is
> for adults planning care; it is not designed for children to use.

### 5. Describe how your app provides value to users.

> School holidays mean juggling who looks after each child, and when. KidRota
> shows the whole holiday as a week grid: you add each child's care as timed
> sessions, and any part of the 8am–6pm day with no one booked shows in red,
> so gaps are obvious before they become a problem. Sessions can be copied to
> other days and other children in one go, and the week can be shared as a
> picture to a family group chat, so relatives don't need the app. There are
> no accounts and no ads, and all data stays on the phone. One holiday is
> free; KidRota Pro (£1.99 a year) unlocks unlimited holidays.

### 6. How many installs do you expect in your first year?

Suggested: **0 – 10K**. A new solo app with no marketing budget; pick a
higher range only if you have a plan that supports it.

## Part 3 — Your production readiness

### 7. What changes did you make to your app based on what you learned during your closed test?

> Version 1.0.1, which testers used, already included 18 changes from
> internal testing: clearer session times (set times with Morning/Afternoon/
> All day presets instead of AM/PM), a rule that a child can only have one
> carer at a time, adding a session to several children and days at once,
> clearer selected days, explicit Save buttons, bigger navigation buttons,
> 12 child colours, and simpler sharing as pictures. From the closed test
> feedback I rewrote the store listing and screenshots to explain the app
> better, and I am adding a "How it works" page and a privacy line on the
> welcome page in the next update (1.0.2).

### 8. How did you decide that your app is ready for production?

> The app ran through the full 14-day closed test with no crashes or bugs
> reported by testers or the testing service. Before testing I did a
> full pre-release review covering Play policy, privacy, billing, Android 14
> and 15 behaviour, data safety and accessibility (contrast and touch
> targets), and fixed every blocker and should-fix item it found. The app
> has 291 automated tests. Subscriptions use Google Play Billing, and the
> privacy policy and Data safety answers match what the app does: no data
> is collected and nothing leaves the phone unless the user shares it.

---

## After you submit

- Google says a decision usually takes **up to about 7 days**; you get an
  email and a message on the Dashboard.
- If approved: create a **Production** release (1.0.1 or 1.0.2). It does not
  go live by itself.
- If turned down: Google says why and may ask for more closed testing.
  Keep the closed test running until you hear back.
