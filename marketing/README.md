# KidRota marketing

The campaign plan, and a weekly agent that drafts the content for you on
semi-autopilot.

## How it works

Think of the agent as a **junior marketer who leaves drafts on your desk every
Sunday night**. You read them over coffee, cross out what you don't like, and
sign off the rest. It never posts anything itself — the pull request is your
signature.

```
  ┌──────────── every Sunday, automatically ────────────┐
  │                                                     │
  │  Agent reads ─► campaign.md, brand-voice.md,        │
  │                 calendar.json (how close is the     │
  │                 next school break?), log.md (what   │
  │                 worked last time?)                  │
  │        │                                            │
  │        ▼                                            │
  │  Drafts the week ─► queue/2026-W45.md               │
  │  + Higgsfield clips for last week's approved posts │
  │        │                                            │
  │        ▼                                            │
  │  Opens a pull request "Marketing: week of …"        │
  └────────┬────────────────────────────────────────────┘
           │
           ▼            ── you, ~15 minutes a week ──
  Review on your phone: edit or delete drafts, then merge  ◄── approval
           │
           ▼
  Post them (copy-paste, or schedule in Meta Business Suite / Buffer)
           │
           ▼
  A week later, add the numbers to log.md  ─────► next Sunday's agent learns
```

**Your weekly job:** merge (or edit) the PR, post the approved drafts, and
jot the results into `log.md`. That last step is what turns it from a content
generator into something that gets better: the agent leans towards whatever
got saved and shared most.

## Files

| File | What it is | Who edits it |
|---|---|---|
| `campaign.md` | Strategy: audience, message, the four-phase loop around each school break, channels, goals | You, occasionally |
| `brand-voice.md` | How KidRota sounds, and the claims it must never make | You, occasionally |
| `config.json` | Switches: launched yet? Play Store link, channels on/off, posts per week, ad budget | You |
| `calendar.json` | 2026-27 school break dates and the phase timings | You, once a year |
| `AGENT.md` | The agent's standing instructions, plus "Lessons" it records | The agent (you can too) |
| `queue/` | One file of drafts per week | The agent drafts, you approve |
| `log.md` | What actually got posted and how it did | You |

## Higgsfield videos

The agent writes a `Higgsfield prompt` for each video post: a short AI-made
scene for the *feeling* (the 9pm kitchen-table scramble), which you put in
front of a real screen recording of the app. It never generates the app
itself, because an AI version would show screens KidRota doesn't have.

Clips are only made for posts you've ticked `[x] approved`, on the next
weekly run, and never more than `higgsfield.max_credits_per_week` in
`config.json`. It never buys credits and never posts.

## The day the app goes live

In `config.json` set `"app_live": true` and fill in `play_store_url`. From
the next run, every call to action points to the Play Store instead of the
landing page.

## Running it by hand

Open a Claude Code session on this repo and say:

> Follow `marketing/AGENT.md` and draft next week.
