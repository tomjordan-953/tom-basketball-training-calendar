# CourtSight AI

> **v2.0 Real Data Intelligence** — premium NBA player performance dashboard with **explainable next-game projections**.

Search a player → see their profile, season averages, recent form, charts, career overview, and a projected next-game statline (with **floor / expected / ceiling**, per-stat confidence, factor cards and a stat-by-stat explanation).

> **Analysis only.** CourtSight AI is a sports analytics tool for fantasy and informational use. It is **not a sportsbook**, includes no odds or betting features, and is not betting advice.

---

## What v2 can and cannot do

**Can**
- Run with **real NBA data** via the `balldontlie` API (server-only key) **or** in **Demo Mode** with bundled sample data — selectable through `DATA_PROVIDER`.
- Show a polished player profile: header with data-source + cache freshness badges, season averages, recent form (L5 / L10 vs season with hot/cold tags), 24-game log, charts, career overview.
- Compute a deeper projection: PTS / REB / AST / STL / BLK / TO / MIN — each with **expected**, **floor**, **ceiling**, per-stat confidence, and a trend arrow.
- Explain each projection with factor cards, stat-by-stat reasoning, and confidence + risk write-ups.
- Cache provider responses with TTLs and in-flight request dedupe; surface freshness ("Cached 12m ago") in the UI.
- Boot end-to-end with **no API key** in Demo Mode.

**Cannot (yet)**
- It does not invent live injury news. If no verified injury/news provider is connected, the UI says so.
- It does not include betting odds, lines, or recommendations — by design.
- It is not a trained ML model. v2 is a transparent multi-factor formula labelled `courtsight-formula-v2`.

---

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

The app boots in **Demo Mode** with bundled sample players if no API key is set.

### Real data mode

Get a free key at [balldontlie.io](https://www.balldontlie.io/) and put it in `.env.local`:

```bash
cp .env.example .env.local
# edit .env.local
BALLDONTLIE_API_KEY=your_key_here
DATA_PROVIDER=auto         # or 'balldontlie' to force live, 'demo' to force sample data
NEXT_PUBLIC_APP_NAME=CourtSight AI
```

The key is read **server-side only** and never exposed to the browser.

### Build / start

```bash
npm run build
npm start
```

### Status check

`GET /api/status` returns the provider mode, API key configuration, model version, and cache stats:

```bash
curl http://localhost:3000/api/status | jq
```

---

## Project structure

```
courtsight-ai/
├─ prisma/schema.prisma         # scaffolded for v3 SQLite cache
├─ scripts/                     # OPTIONAL Python NBA ingestion (not run by Next.js)
│  ├─ ingest-nba-api.py
│  └─ README_NBA_API_INGEST.md
├─ src/
│  ├─ app/                      # Next.js App Router (pages + API routes)
│  ├─ components/               # layout, ui, player, charts, search
│  ├─ lib/
│  │  ├─ data/providers/        # demoProvider + balldontlieProvider
│  │  ├─ data/cache.ts          # in-memory TTL cache + meta + dedupe
│  │  ├─ prediction/            # v2 projection engine, factors, confidence
│  │  └─ utils/
│  └─ types/                    # Player, GameLog, Projection (v2)
├─ tailwind.config.ts
├─ next.config.mjs
├─ CHANGELOG.md
└─ package.json
```

---

## Data sources

CourtSight uses a **provider abstraction** so data sources can be swapped without touching UI:

```ts
interface SportsDataProvider {
  searchPlayers(query): Promise<Player[]>;
  getPlayer(id):       Promise<Player | null>;
  getPlayerGameLogs(id, n);
  getSeasonAverages(id);
  getCareerSeasons(id);
  getNextGame(id);
  getOpponentContext(opponent);
  getInjuryContext(id);
  getNewsItems(id);
}
```

v2 ships three providers:
- **`espnProvider`** — *default in `auto` mode*. Uses ESPN's public NBA endpoints (`site.web.api.espn.com`, `sports.core.api.espn.com`) for **real** player search, profiles, season averages, recent game logs, news, and next-game info. **No API key required.** Server-side fetch only.
- **`balldontlieProvider`** — calls balldontlie when `BALLDONTLIE_API_KEY` is set and `DATA_PROVIDER=balldontlie`. The free tier authorises only player search/profile, so live game logs and season averages fall back to demo simulation by name match (clearly labelled `(free tier)` in the UI).
- **`demoProvider`** — bundled, deterministic sample data for ~10 players. Game logs (24 games each), season averages, opponent context, an "injury" stub and "news" notes are all clearly labelled **Demo data**.

Future providers (SportsDataIO, NBA.com via the optional `scripts/ingest-nba-api.py`) just implement the same interface.

`DATA_PROVIDER` controls selection:
- `auto` (default) — use ESPN. No API key needed.
- `espn` — explicitly use ESPN.
- `balldontlie` — use balldontlie (requires `BALLDONTLIE_API_KEY`; free tier blocks live stats).
- `demo` — force bundled sample data.

---

## How v2 predictions work

The projection blends multi-window form with context multipliers:

```
expected_stat = 0.30 · seasonAvg
              + 0.25 · last10Avg
              + 0.15 · last5Avg
              + 0.10 · last20Avg
              + 0.10 · trendBaseline
              × (matchup × rest × injury) multipliers
```

If the last 20 games aren't available, weight redistributes to season and last 10.

For each stat the engine also computes:
- **floor** and **ceiling** from the recent-game standard deviation, clamped to realistic NBA ranges,
- **per-stat confidence** from coefficient-of-variation and sample size,
- a **trend arrow** (▲ / ▼ / ▬) from L5-vs-L10 delta.

Multipliers:
- **Matchup**: opponent defensive difficulty (`Easy / Average / Tough`) — ±6%.
- **Rest**: back-to-back games push minutes/production down ~4%; 3+ days rest pushes them up ~2%.
- **Injury**: `Active` neutral, `Day-to-Day` 0.95, `Questionable` 0.92, `Out` 0, `Unknown` neutral.

The **overall confidence score** (0–100) starts at 70 and is adjusted by sample size, minutes stability, scoring volatility, injury source presence, and opponent data presence. **Risk level**: `Low` ≥ 75, `Medium` 55–74, `High` < 55.

Each projection ships with:
1. The expected statline + per-stat floor/ceiling/confidence/trend.
2. A confidence percentage + a written confidence explanation.
3. A risk level + risk-flag chips and a written risk explanation.
4. An all-around **form index** (0–100) versus the season baseline.
5. A summary paragraph and a stat-by-stat written breakdown.
6. A data-quality score with explicit limitations notes.

The model is intentionally readable. Anyone can audit it in [`src/lib/prediction/projectionEngine.ts`](src/lib/prediction/projectionEngine.ts).

---

## Cache layer

`src/lib/data/cache.ts` provides an in-memory TTL cache used by every API route and every server component:

| Key             | TTL    |
|-----------------|--------|
| Search results  | 12 h   |
| Player profile  | 24 h   |
| Game logs       | 6 h    |
| Season averages | 6 h    |
| Projection      | 45 min |

It also:
- Dedupes in-flight requests for the same key (no duplicate fetches under load).
- Returns timestamped meta so the UI can show a "Cached Xh ago" badge.

A SQLite-backed Prisma cache is scaffolded in [`prisma/schema.prisma`](prisma/schema.prisma) for v3 persistence.

---

## App states the UI handles

- Loading skeletons while the player profile fetches.
- Empty search state with a hint.
- "No player found" via a custom not-found page.
- "Not enough recent games for a strong projection" — when fewer than 3 recent games are available.
- Provider unavailable — API routes return a clean JSON error and the UI falls back gracefully.
- Demo Mode badge in the top bar when no API key is set; Real-data badge when balldontlie is connected.
- "No verified injury/news source connected" copy when those data sources are absent.
- "Cached Xh ago" freshness chip on every player profile.

---

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/search?q=` | Search players (debounced on the client, cached server-side) |
| GET | `/api/players/:id` | Full profile + logs + averages + context + cache ages |
| GET | `/api/players/:id/projection` | Advanced projection: expected/floor/ceiling/confidence/risk + factors + stat explanations |
| GET | `/api/status` | Provider mode, API key configuration, model version, cache stats |

---

## Deployment

### Vercel
1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Set environment variables in Project Settings → Environment Variables:
   - `BALLDONTLIE_API_KEY` (optional)
   - `DATA_PROVIDER` (`auto`, `demo`, or `balldontlie`)
   - `NEXT_PUBLIC_APP_NAME` (optional)
4. Deploy. Next.js 14 App Router routes will be detected automatically. No build customisation required.

### Render
1. New → Web Service → connect repo.
2. Build command: `npm install && npm run build`.
3. Start command: `npm start`.
4. Add the same environment variables as above.

The in-memory cache is per server instance. For multi-instance deployments, plug in a shared cache (Redis or the scaffolded Prisma/SQLite) — replace `src/lib/data/cache.ts` while keeping the `cached` / `cachedWithMeta` API.

---

## Optional Python ingestion

`scripts/ingest-nba-api.py` is a stub for richer NBA.com data via the unofficial `nba_api` package. It is **not** required for the Next.js app to install, build, or run. See [`scripts/README_NBA_API_INGEST.md`](scripts/README_NBA_API_INGEST.md).

---

## Roadmap

**v2 (this release)** — Real data integration, deeper projections, freshness UI, dedup cache, optional NBA ingestion stub.

**v3**
- Persistent SQLite/Postgres cache via the bundled Prisma schema.
- Verified injury/news provider integration.
- Saved players / watchlist.
- Team matchup model.

**v4**
- ML model trained on historical games.
- Prediction accuracy tracking + back-testing dashboard.

**v5**
- Alerts, fantasy-style dashboards, multi-sport support.

---

## Legal & disclaimer

- CourtSight AI is **not affiliated with the NBA** or any team.
- Predictions are statistical estimates and **can be wrong**.
- Player names and team names are used factually for analysis.
- All injury/news content visible without a connected provider is clearly labelled **Demo data**. CourtSight does not invent or scrape real injury reports.
- This app does **not** provide gambling or betting advice. There are no odds, lines, sportsbook integrations, or "place bet" actions anywhere in the product.

---

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm start          # serve production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```
