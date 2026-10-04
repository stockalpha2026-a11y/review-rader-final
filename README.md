# ReviewRadar

> AI-powered review intelligence for Indian small businesses. Currently scraping Google Reviews and Reddit.

## Start locally

```bash
npm install   # only needed once
npm run dev
```

Open → **http://localhost:5173**

## Required setup before sign-up/sign-in will work

This project now uses **real Supabase Auth** (passwords are hashed
server-side, sessions are real signed tokens — see
`src/utils/supabaseClient.ts` for why this matters).

Two one-time steps, both in your Supabase project dashboard:

1. **Turn off email confirmation** — Authentication → Providers →
   Email → toggle off "Confirm email" → Save. Without this, new
   sign-ups will be created but blocked from logging in until they
   click a confirmation link this app doesn't currently send.
2. **Run the database migration** — open `supabase_setup.sql` in this
   repo, copy its contents into Supabase → SQL Editor → New query →
   Run. This creates the `businesses` table and turns on Row Level
   Security, so each user's data is genuinely isolated at the
   database level (not just hidden by app code).

## Demo account

Email: `demo@reviewradar.com` · Password: `demo1234`

This is a hardcoded local-only account — it never touches Supabase
Auth or the database, and exists purely so people can explore a
populated dashboard without signing up. It loads one pre-seeded
business (Cafe Coco Group) from mock data.

## Mock data

Five mock businesses ship with the app so the dashboard has
something to show before real scraping is wired up:

| Business | Rating | Reviews | Sentiment |
|---|---|---|---|
| Sharma Family Dhaba | 3.9 | 8 | 52% — needs attention |
| Cafe Coco Group | 4.6 | 8 | 91% — healthy |
| Urban Spice Kitchen | 4.3 | 8 | 74% — healthy |
| The Brew House | 4.7 | 8 | 88% — healthy |
| Spice Garden Hotel | 4.1 | 8 | 66% — needs attention |

Each business has 8 reviews across Google and Reddit, a daily AI
report, urgent alerts when sentiment is critical, and AI-drafted
replies. Mock data lives in `src/utils/mockData.ts` and is clearly
separated from the data layer so swapping in real scraped data later
is a matter of changing what feeds `MOCK_REVIEWS` /
`MOCK_DAILY_REPORTS`, not rewriting the UI.

A couple of reviews per business carry a `fake_signal` field — a
short reason the system flagged them as possibly fake (generic
praise with no detail, suspiciously clustered posting times, etc).
This drives the "Possibly fake" badge on review cards. It's a
detection signal for the business owner to investigate, not an
automatic removal — ReviewRadar can't delete a review from Google or
Reddit itself.

## What's in the app

- **Landing page** — pricing, features, how-it-works, FAQ link
- **Sign up / Sign in** — real Supabase Auth, plus the demo bypass above
- **Dashboard** — multi-location switcher, sentiment donut chart
  (good/medium/bad split), platform breakdown, filterable reviews,
  AI daily report, settings panel
- **Onboarding wizard** — search and connect a business, choose which
  platforms to monitor, works for both the first business and
  additional locations ("Add location")
- **Legal pages** — `/terms`, `/privacy`, `/cookies`, `/faq`, all
  based out of Jabalpur, Madhya Pradesh

## Security notes

- Auth: real Supabase Auth, hashed passwords, signed session tokens.
- Database: Row Level Security on `businesses` — see
  `supabase_setup.sql`. Each policy checks `auth.uid() = user_id`, so
  even a malicious client can't read or write another user's rows.
- Input validation: email format, length limits, and a basic
  script-injection filter on free-text fields (name, business name,
  address) before anything is stored or rendered. Supabase's client
  library parameterizes queries automatically, so classic SQL
  injection isn't reachable through normal use of `.from()` — this
  validation is a second layer on top of that, not a replacement for it.
- Known tradeoff: business data falls back to a local browser cache
  if Supabase is unreachable, so the dashboard still loads something
  useful offline. That cache is a convenience copy, not the source of
  truth — Supabase (with RLS) is.

## Known limitation

`@supabase/supabase-js` is currently the only data-layer dependency
with no fallback for auth itself (business data has a local cache
fallback; auth doesn't, since you can't really fall back on
authentication). If Supabase has an outage, sign-in/sign-up will
fail. Worth knowing before this goes to real users at scale.
