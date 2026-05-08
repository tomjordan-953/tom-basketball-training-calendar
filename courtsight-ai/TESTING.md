# Manual test plan — v2.0 Real Data Intelligence

## Setup

```bash
npm install
npm run dev
```

## Demo Mode (no API key)

1. **App starts.** http://localhost:3000 renders the dashboard hero, "Demo Mode" badge, "v2 · Real Data Intelligence" badge, and 4 featured player cards.
2. **Search works.** Typing `shai` in the top-bar search shows "Shai Gilgeous-Alexander" within ~250 ms (debounced, min 2 chars). Pressing Enter routes to `/players?q=shai`.
3. **Player profile loads.** Click a featured card. The profile shows: header with **Demo data** + **Cached Xs ago** badges, projection card, **Projection analysis** section, season averages, **Recent form** card with hot/cold tags, recent stat trend chart, recent game log table (24 rows max), career overview chart, projection vs season chart, minutes trend chart, status & context card.
4. **Projection card is correct.** Confidence % between 5–95, risk badge, 7 stat cells (PTS REB AST STL BLK TO MIN). Each cell shows **expected**, **floor · ceiling**, **per-stat conf%**, and a trend arrow. Risk-flag chips appear when applicable.
5. **Projection analysis is detailed.** Section shows the summary paragraph, factor cards grouped by Form / Minutes / Matchup / Rest / Volatility / Injury / Data, a stat-by-stat explanation grid, confidence + risk write-ups, and a Data Limitations block.
6. **No verified injury source copy.** The status card shows the demo injury status with a "Demo data" caveat; the news section reads "News provider not connected".
7. **Charts render and feel smooth.** All Recharts elements display with the dark theme, tooltips on hover. Charts cap at 15 most-recent points and are memoized.
8. **Mobile layout.** Resize the window to ~390 px wide. Sidebar collapses, cards stack into one column, projection cells reflow into 2 columns, search stays usable.
9. **Missing player.** Navigate to `/players/does-not-exist`. The not-found page renders cleanly.
10. **Empty search.** Navigate to `/players?q=zzzzzzzzzz`. The empty state appears.
11. **API routes.** Hit `/api/search?q=jokic`, `/api/players/demo-1`, `/api/players/demo-1/projection`, `/api/status`. All return clean JSON. The status route reports `provider.mode: "auto"` (or `"demo"`), `apiKeyConfigured: false`.
12. **Cache freshness shown.** Reload a player page. Header badge reads "Cached Xs ago" and increases on subsequent reloads until TTL expires.

## Real Data Mode (`BALLDONTLIE_API_KEY`)

1. Add the key to `.env.local` and restart `npm run dev`.
2. Top-bar badge changes to "Live • balldontlie". Player headers show "Real data · balldontlie".
3. `GET /api/status` reports `provider.name: "balldontlie"` and `apiKeyConfigured: true`.
4. Searching for a real player (e.g. `lebron`) returns balldontlie results.
5. Endpoints unsupported by the free tier (career, schedule, injuries, news) gracefully degrade — the UI shows the relevant "unavailable" copy and the data-quality block notes the gaps.
6. **API failure fallback.** Temporarily set `BALLDONTLIE_API_KEY=invalid`. Searching shows demo fallbacks; the player profile shows clean error states for the missing data.
7. **Force modes.** Set `DATA_PROVIDER=demo` — top bar reads "Demo Mode" even with a key set. Set `DATA_PROVIDER=balldontlie` with no key — UI runs in Demo Mode and the status route includes a `fallbackReason`.

## Performance

- Player profile page transitions feel instant on cache hit (sub-100 ms server work).
- Search input is debounced (200 ms) and only fires after 2+ characters.
- Charts are memoized — switching tabs and returning does not re-render them needlessly.
- In-flight request dedupe: hammering the projection API with parallel requests does not multiply provider calls.

## Build

```bash
npm run build
```

Build must succeed with zero type errors. `npm start` then serves the production bundle on port 3000.

## What to look for

- No raw stack traces in the UI.
- No console errors on the dashboard or a player profile.
- No betting/odds/sportsbook copy anywhere.
- No claim of real-time injury or news data when no provider is connected.
- API key never appears in any browser network response or source.
- Floor/ceiling are always present alongside expected stats.
- Confidence and risk are explained in plain English, derived from the same factors shown in the analysis grid.
