# CourtSight AI — Roadmap

This is the public, opinionated path from "single-user analytics dashboard" (today) to "social fantasy projection app with friends-only fake-currency wagering" (where you want to land). Each milestone is small enough to ship in a session.

> Reminder for every milestone below: **fake currency only.** No real money in, no real money out, no payment integrations, no third-party sportsbook handoff. Wagering is purely social play between friends.

---

## v2.x — accuracy & polish (in progress)

Already shipped:
- v2.0 — explainable formula projections, demo + balldontlie
- v2.1 — ESPN provider for real stats with no API key
- v2.2 — prediction tracking + accuracy grading
- v2.3 — vibrant homepage, real game reports with retro projections
- v2.4 — per-36 / EWMA / Bayesian shrinkage engine, custom logo
- v2.5 — real ESPN team defensive ratings, home/away splits, per-player calibration, playoff context
- v2.6 — head-to-head weighting, opponent-injury usage bump, schedule fatigue, trimmed-mean ensemble, streak badge, head-to-head card

Still in v2.x:
- v2.7 — opponent's last-10 defense (not season), ESPN team gamelog adapter
- v2.8 — Vegas total / spread signal from ESPN scoreboard `odds` (where present), pace from both teams
- v2.9 — multi-window ensemble (L5 / L10 / L20 separate models combined)

---

## v3 — accounts, persistence, multi-device

This is the foundation for everything social. Until accounts exist, watchlist + tracking are per-browser only.

### v3.0 — auth + Postgres

- **NextAuth.js** with email + Google providers. Sessions in JWT.
- **Postgres** (Vercel Postgres or Supabase free tier).
- **Prisma**: migrate the existing `prisma/schema.prisma` skeleton to real tables:
  - `User`, `Account`, `Session` (NextAuth)
  - `Watchlist` (per-user, replaces `localStorage`)
  - `PredictionRecord` (replaces `data/predictions.json`, indexed by user + player)
  - `PredictionCache`, `GameLogCache`, `ProjectionCache` (move in-memory cache for multi-instance deploys)
- **Settings page** with provider mode + theme + data preferences.
- **Per-user calibration** — model bias correction becomes per-user-per-player, so heavy users get sharper personalised predictions.

### v3.1 — public profiles

- Pick a username, see your accuracy, watchlist, recent activity.
- Public link `/@username`.
- Privacy toggle (show/hide tracking details).

---

## v4 — social: groups, chat, leaderboards

### v4.1 — groups
- Create a "League" (just a private group of users — never use the word "league" in revenue copy).
- Invite friends by link.
- Group dashboard: watchlist union, top performers chasing accuracy, weekly recap.

### v4.2 — chat
- Per-group threaded chat using **Pusher Channels**, **Ably**, or **Liveblocks** (all have generous free tiers — no payment integration).
- Inline player mentions: `@SGA` expands to a mini projection card.
- Emoji + reactions.
- No DMs in v4.2 (they get spammy fast).

### v4.3 — leaderboards
- Per-group accuracy leaderboard, weekly + season.
- Personal accuracy badge on every chat message ("Sarah · 73% accuracy").
- "Pick of the day" — one shared call per user per day, others can react.

---

## v5 — fake-currency wagering ("CourtCoins")

> **Spelled out one more time:** zero real money, zero payment processors, zero ability to convert in any direction. Treat the currency exactly like Mario Kart coins — fun, in-app, ephemeral. The legal posture matters: this avoids gambling regulation entirely as long as nothing is purchasable for money and nothing is redeemable for value.

### v5.0 — currency primitives
- **CourtCoins** ledger in Postgres. Every user starts with 1,000 free CourtCoins.
- Daily login bonus of 50 CourtCoins.
- "Earn by being right" — accuracy gives you coins back: every correctly graded prediction (within tolerance) credits 5 CourtCoins.
- Hard reset button on settings page — wipe your balance and start over.
- **No purchase. No redemption. Zero monetary value. Stated in copy + ToS.**

### v5.1 — friend wagers ("Calls")
- In a group, pick a player + game + stat (PTS / REB / AST), set a target, set a CourtCoin stake.
- Friends in the group can take "over" or "under". Multiple takers split the pot.
- Settles automatically against ESPN box score the day after the game.
- Settled wager appears in chat with the diff and the winner.
- Hard cap on stake size per call (e.g. 500 CourtCoins).

### v5.2 — group challenges
- Weekly group challenge: "predict tonight's top scorer", "guess closest to LeBron's PTS".
- Pot is fixed and split by accuracy ranking.
- All settled by real ESPN data.

### v5.3 — accuracy-pegged "ranks"
- Bronze / Silver / Gold / Diamond unlocks based on your real rolling accuracy.
- Cosmetic only — no gameplay advantage.

> **Legal & policy guardrails carried throughout v5:**
> - Every wager UI repeats: *"CourtCoins are a free in-app token with no monetary value and cannot be purchased or redeemed."*
> - Block CourtCoin transfers between users that look like they encode value (e.g. exact-amount round-trips).
> - Geofence by storefront if the app is ever shipped through Apple/Google: their policies require explicit "no real-money gambling" disclosures.
> - Age gate at sign-up (13+) regardless.

---

## v6 — multi-sport

- Abstract the `SportsDataProvider` interface to handle non-NBA stats (NFL via ESPN's identical endpoints, then MLB).
- Sport switcher in the sidebar.
- Calibration model retunes per sport.

---

## v7 — native app

- Wrap the existing Next.js app with **Capacitor** or rebuild the shell in **Expo** with the projection engine extracted into a shared TypeScript package.
- Push notifications for: friend made a Call, your tracked player tipped off, your weekly accuracy summary.

---

## What I'd genuinely caution against

- **Real-money anything.** Even "small wagers" trip gambling regulation in nearly every jurisdiction and require licensing per state/country. Not worth it for a friends app.
- **Scraping injury news from non-official sources** — already excluded from the design, keep it that way.
- **AI-generated "lock of the day" copy.** It's gambling-promotion energy; it pulls the app's positioning toward sportsbook-adjacent. Stay analytics-first.
