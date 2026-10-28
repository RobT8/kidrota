# KidRota marketing campaign: "School holidays, sorted"

## The idea in one line

Every school break, working parents rebuild the same jigsaw — Nan on Monday,
holiday club Tuesday and Wednesday, a playdate swap Thursday, a day of leave
Friday — usually in a WhatsApp thread and somebody's head. KidRota is the box
lid: the whole picture in one place, with the missing pieces glowing red.

The campaign owns that **jigsaw moment**, and shows up when it happens: the
few weeks before each school break.

## Who we're talking to

| Audience | What's in their head | What we say |
|---|---|---|
| **The rota-keeper** (primary) — a working parent, usually the one who "does the holidays", kids aged 4–11 | "Who's got them on the Wednesday?" | Stop holding it all in your head. See the gaps before they bite. |
| **The other parent** | "Just tell me which days I'm on" | Get the plan as one code, paste it, done. |
| **Grandparents and regular helpers** | "When do you need me?" | (Reached through the parent's shared screenshot, not targeted directly.) |
| **Gatekeepers** — PTAs, school newsletters, parenting writers | "Is this useful and safe to recommend?" | Free to plan, no account, nothing leaves the phone. |

## Why KidRota wins (proof points we can always use)

These are true of the app today and can be repeated freely:

1. **Gaps glow red.** An unplanned morning or afternoon can't hide.
2. **Plan a day, copy it across the week** in one tap.
3. **Simple or detailed:** mornings/afternoons, or exact times.
4. **Share with the other parent** as one pasteable code — no account needed.
5. **Screenshot the week** to send to Nan.
6. **Private by design:** no account, no sign-up, no servers. Everything stays
   on the phone. Works offline.

Never claim anything not in that list (no iPhone version, no cloud sync, no
"used by X parents") until it's true. See `brand-voice.md`.

## Rhythm: the campaign follows the school calendar

Interest in holiday cover isn't steady — it surges in the weeks before each
break. So the campaign is a loop that repeats five times a year rather than
one big launch:

```
          SPARK          PLAN            SURVIVE        REFLECT
     6–4 weeks out   3–1 weeks out    during break   week after
   ┌─────────────┐ ┌─────────────┐  ┌────────────┐ ┌───────────┐
   │ name the    │→│ show the    │→ │ empathy,   │→│ reviews,  │→ next break
   │ jigsaw pain │ │ app fixing  │  │ humour,    │ │ "what     │
   │             │ │ it          │  │ tips       │ │ worked?"  │
   └─────────────┘ └─────────────┘  └────────────┘ └───────────┘
   relatable posts  demos, how-tos   light touch    social proof
```

Dates for 2026-27 are in `calendar.json`.

| Break | Spark starts | Plan starts | Priority |
|---|---|---|---|
| Christmas 2026 | 7 Nov | 28 Nov | Soft launch / pre-launch audience building |
| February half-term 2027 | 2 Jan | 23 Jan | First full loop — "New year, sorted holidays" |
| Easter 2027 | 13 Feb | 6 Mar | Two-week break: strongest "jigsaw" pain so far |
| May half-term 2027 | 17 Apr | 8 May | Also seed **summer** planning ("start now") |
| **Summer 2027** | 11 Jun | 2 Jul | The big one — six weeks of cover. Most budget goes here |

## Content pillars

| Pillar | Share of posts | Example |
|---|---|---|
| **The jigsaw** (relatable pain) | 35% | "POV: it's 9pm and you've just realised nobody's got them on the Thursday." |
| **Show me** (app demos) | 30% | 15-second screen recording: add Nan, copy Monday across the week, red gap appears on Thursday. |
| **Holiday helpers** (useful, not about the app) | 25% | "5 questions to ask before booking a holiday club." "How to set up a playdate swap with another family." |
| **Proof** (reviews, user rotas shared with permission) | 10% | Once there are reviews. Until then, behind-the-scenes from the maker. |

## Channels

| Channel | Role | Cadence |
|---|---|---|
| Instagram (Reels + carousels) | Main home for "jigsaw" and "show me" | 2–3 / week |
| TikTok | Same videos as Reels, native captions | 2 / week |
| Facebook Page | Reposts; what local parent groups link to | 1–2 / week |
| Facebook / local parent groups | Helpful answers when people ask about holiday cover. Mention KidRota only when relevant and allowed | As it comes up |
| School PTAs & newsletters | Short blurb before each break — "free planner, nothing leaves your phone" | Once per break |
| Press & bloggers | Pitch the holiday-childcare-juggle story ahead of Easter and summer | 2× a year |
| Google Play listing | Screenshots and short description reflect the current season | Refresh each break |

## Goals and how we'll measure them

| Stage | Metric | Where it comes from |
|---|---|---|
| Attention | Reach, saves, shares per post | Instagram / TikTok insights → `log.md` |
| Interest | Landing-page and Play listing visits | Play Console store listing visitors |
| Action | Installs | Play Console |
| Love | Ratings ≥ 4.5, review count | Play Console |

Saves and shares matter more than likes: a parent who saves a post is planning
to come back to it when the holiday lands.

There's no in-app analytics (by design — the privacy promise), so the Play
Console and social insights are the only numbers. Don't add tracking to the
app for marketing.

## Budget

Starts at **£0 — organic only** (`config.json` → `monthly_ad_budget_gbp`).
When there's budget, spend it in the **Plan** phase only, on whichever post
already did best organically that cycle, boosted to parents in England. The
agent recommends which post to boost; it never spends money itself.

## Before launch

While `app_live` is `false` in `config.json`, every call to action points to
the landing page ("follow along — launching soon") instead of the
Play Store. Flip it to `true` and add `play_store_url` the day the app is live.
