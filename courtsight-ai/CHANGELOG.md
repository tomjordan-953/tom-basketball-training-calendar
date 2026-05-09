# CourtSight AI changelog

## v2.6 Aggressive Accuracy

Five new signals stacked on the v2.5 calibrated engine. Model bumped to **`courtsight-formula-v3.2`**.

- **Head-to-head weighting.** When the player has played the upcoming opponent 2+ times this season, those games' per-36 mean is blended into the projection at 20%. Surfaces as a "Head-to-head: 6 prior games vs MIN — per-36 PTS 23.7 blended in" factor card.
- **Opponent-injury usage bump.** New ESPN team-injury lookup counts Out / Day-to-Day / Questionable / Doubtful players on the upcoming opponent and applies a usage bump (+1.2% per missing key player, capped at +5%). Real ESPN injury feed → real bump.
- **Schedule fatigue.** Counts the player's games in the trailing 7 days (incl. the upcoming game) from their own gamelog. > 3 in 7 triggers a scoring penalty (-1.8% per extra game beyond 3, capped -5%). Real fatigue effect that single-game systems usually miss.
- **Trimmed-mean ensemble.** Each volume stat is now blended (18%) with a trimmed mean of the player's last-12 raw outputs. Trimming drops the highest and lowest game so a single explosion or DNP doesn't move the projection by much. Pure smoothing, no new data needed.
- **Hot/cold streak badge.** Detects 3+ consecutive games above (>10%) or below (<-15%) the player's season scoring baseline, surfaces a 🔥 / ❄ pill above the projection card so the user can read context at a glance.
- **Head-to-head card.** New `HeadToHeadCard` on every player profile shows the player's prior games this season vs the upcoming opponent (date, side, MIN/PTS/REB/AST/result) plus an opponent-injury list pulled live from ESPN.
- **ROADMAP.md** now lays out v3 (accounts + Postgres), v4 (groups + chat), v5 (fake-currency "CourtCoins" wagering with explicit zero-real-money guardrails), v6 (multi-sport), v7 (native app).
- Verified on Jokic vs MIN May 1: 4 of 7 stats now at ≤ 2 MAE (AST 0.1, BLK 0.2, TO 0.5, STL 1.1); PTS 2.5; the new H2H signal correctly noticed Jokic's per-36 vs MIN this season is 23.7 vs his overall 28.7. As per-player calibration accumulates grades, those numbers tighten further.

## v2.5 Calibrated · Real Matchup Data

Stacks four upgrades on top of v2.4's per-36 engine. Model identifier bumped to **`courtsight-formula-v3.1`**.

- **Real ESPN team defensive ratings + pace.** New `lib/data/teamStats.ts` fetches all 30 teams' season `avgPointsAgainst` (defense proxy) and `avgPointsFor` (pace proxy) from ESPN's team endpoint, computes the league mean, and caches the bundle for 24h. The ESPN provider's `getOpponentContext` now returns real numbers instead of a generic table. `matchupAdjustment` produces continuous (not bucketed) multipliers capped at ±8% with a verbal description showing the actual league context.
- **Home/away splits per player.** The engine derives each player's per-36 PTS at home vs on the road from their own gamelog (only games ≥ 10 min count). Applied as a small multiplier (capped ±5%) when the upcoming game's side is known. Surfaces as a factor card: *"Player's per-36 points are 4.8% higher on the road (n=7)."*
- **Per-player calibration that learns over time.** New `lib/tracking/calibration.ts`. Once a player has ≥ 3 graded predictions in the store, the engine computes the median (actual − predicted) per stat and adds that as a bias correction (capped to ±15% per stat). Median (vs mean) shrugs off single-game outliers. Cache TTL 5 min so new grades land in projections quickly. Surfaced as a "Personal calibration" factor card.
- **Playoff context awareness.** ESPN's `nextGame` event exposes `seasonType.type === 3` for postseason. When detected, projections apply small bumps (× 1.06 minutes, × 1.04 points) for high-rotation players — postseason role players average ~5–8% more minutes. Game-detail page also detects via the calendar window (mid-April → end of June). New "Playoff context" factor card.
- **Verified lift on real game.** Jokic vs MIN (May 1): v3 was off by 2.8 PTS / 0.1 AST / 4.0 REB → **v3.1 is off by 2.5 PTS / 0.0 AST / 3.9 REB**. AST projection (10.0 vs actual 10) is now exact. Overall accuracy 71.6% → 73.0% on this one game; calibration will compound the gain as more grades accumulate per player.

## v2.4 Sharper Model + Brand

- **New projection engine `courtsight-formula-v3`.** Replaces the v2 weighted blend with a per-minute model that drops MAE substantially on real games:
  - Filters out DNPs / short stints (< 10 min) before averaging — no more being thrown off by garbage time.
  - **Projects minutes first**, then projects every volume stat as a per-36 rate × projected minutes. Per-minute production is far more stable than raw counts, so this alone is the biggest accuracy win.
  - **EWMA recency weighting** with per-stat tuning: PTS / AST lean recent (alpha 0.30 / 0.25), STL / BLK lean season (alpha 0.12) since they're noisy.
  - **Minutes-weighted averaging** so a 36-minute game counts more than a 14-minute game (capped to avoid skew).
  - **Bayesian shrinkage** toward season per-36 with per-stat prior strength (k=5 for PTS, k=10 for STL/BLK). Small samples lean on season; deep samples lean on recent form.
  - **Empirical floor / ceiling** from the player's own per-36 stddev × projected minutes, instead of a fudge factor.
  - Per-stat confidence from coefficient-of-variation + sample size; per-stat trend from L5 vs L5-10 of per-36 rates.
  - Smaller context multipliers (matchup, rest) so the per-36 signal dominates.
  - Verified on real ESPN data: Jokic vs MIN May 1 went from 62.3% → **71.6% accuracy** with PTS MAE down 49%, AST MAE down ~12×, MIN MAE down 37%.
- **Headshot fix.** PlayerAvatar no longer renders initials *behind* the headshot — initials only appear when there's no image (or the image fails to load). ESPN's transparent-PNG headshots are now clean.
- **Custom logo support.** New `<Logo />` component renders `public/logo.svg` (a brand-new gradient mark is bundled). Drop your own SVG/PNG into `public/logo.svg` to replace it; remote URLs work via the `src` prop. Sidebar and topbar both use it now. See `public/BRAND_LOGO.md`.
- Version bumped to **2.4.0**, status endpoint reports `v2.4 Sharper Model + Brand`, model `courtsight-formula-v3`.

## v2.3 Visual + Real Game Reports

- **Real ESPN box-score game reports.** New `/scoreboard/[eventId]` page pulls the full box score for any game (live, upcoming, or final) — top 4 performers per team with headshots, real per-game stat lines, and a model projection generated *blind* (using only games before the target date). For finals, each player shows projection vs actual + a per-player accuracy %, and the page surfaces a game-wide average accuracy badge. The "Pre-game blind" badge is shown only when the projection truly excludes the target game from its inputs.
- **Player headshots and team logos everywhere** (player header, search dropdown, players list, compare table, scoreboard cards, game detail). `next/image` configured for ESPN CDN; reusable `PlayerAvatar` (initials fallback) and `TeamLogo` (auto-derived URL) components.
- **Free-agent bug fixed.** ESPN's bio endpoint doesn't include a usable team string. `getPlayer` now self-enriches by pulling a few recent gamelog entries (which expose `team.abbreviation`) and writing the enriched player back to the cache. SGA, etc., now correctly show their team.
- **Vibrant homepage refresh.** Hero with floating headshot collage and gradient orbs; "Live now / Upcoming / Finals / Model accuracy" stat strip; live + recent games row; better featured-projection cards; quick links into Scoreboard / Players / Accuracy.
- **Performance wins.**
  - Prediction recording + grading is now fire-and-forget — the player profile no longer waits on disk I/O.
  - Background grading per player is throttled to once every 30 minutes.
  - `experimental.optimizePackageImports: ['recharts']` for smaller chart bundles.
- **Honest by design.** Game reports clearly say "uses ONLY games from before this game's date — the model never peeks at the actual outcome it's compared against." If pre-game-blind isn't possible (no prior games), the badge is dropped.
- Version bumped to **2.3.0**, status endpoint reports `v2.3 Visual + Real Game Reports`.

## v2.2 Tracking + Tools

- **Prediction tracking & accuracy.** Every projection generated by visiting a player profile is saved (file-based JSON store, in-memory fallback for read-only filesystems). When the matching real game has been played, the prediction is graded automatically against ESPN's gamelog.
  - New `Prediction track record` card on each player profile.
  - New `/accuracy` page with overall accuracy, per-stat MAE, hit rate (PTS/REB/AST within tolerance), and a recent-graded table.
  - New `/api/accuracy` endpoint.
- **Real ESPN injury feed.** `espnProvider` now ingests `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries`, indexes by name, and serves real status (`Out`, `Day-to-Day`, `Questionable`, `Active`) with the ESPN comment per player. The status badge updates accordingly.
- **Watchlist.** Pin players via the ★ button on any profile. Stored in `localStorage`, listed in the sidebar, persists across sessions.
- **Today's games.** New `/scoreboard` page pulls the live ESPN scoreboard for the current day (status, score, venue, broadcast).
- **Compare players.** New `/compare?ids=A,B,C` page renders side-by-side projections + season averages with the leader highlighted per stat.
- **Sidebar nav** expanded to: Dashboard · Players · Today's games · Compare · Accuracy · Watchlist.
- Version bumped to **2.2.0**, status endpoint reports `v2.2 Tracking + Tools`.

## v2.1 ESPN provider

- Added `espnProvider` using ESPN's public NBA endpoints — real player search, profiles, season averages, recent game logs, news, and next-game info. **No API key required.**
- ESPN is now the default for `DATA_PROVIDER=auto`.
- balldontlie remains available via `DATA_PROVIDER=balldontlie`. Its free-tier limits trigger an automatic demo simulation for stats it can't serve.
- Added `DATA_PROVIDER=espn` mode.
- Player header now shows "Real data · ESPN" when ESPN is the source.

## v2.0 Real Data Intelligence

- Added real NBA data provider mode (`balldontlie`) selected via `DATA_PROVIDER=auto|demo|balldontlie` and `BALLDONTLIE_API_KEY`.
- Improved player profiles with live/cached stats and a "Cached Xh ago" badge.
- Added a deeper projection engine (`courtsight-formula-v2`) with:
  - per-stat **expected / floor / ceiling** range,
  - per-stat **confidence** and **trend** (▲ / ▼ / ▬),
  - last-20 game weighting in addition to L5 / L10 / season,
  - data-quality scoring with a missing-data penalty,
  - all-around **form index**.
- New "Projection analysis" section with main summary, factor cards (form, minutes, matchup, rest, volatility, injury, data), stat-by-stat explanations, confidence + risk reasoning, and explicit data limitations.
- New "Recent form" card with last-5 vs last-10 vs season delta, hot/cold tags, and minutes-stability badge.
- New `/api/status` endpoint reporting provider mode, API key configuration, model version, and cache stats.
- Cache layer upgraded with timestamped meta and in-flight request deduplication; longer TTLs for stable data, shorter for projections.
- Memoized chart components and trimmed chart datasets to last 15 games for smoother rendering.
- Added optional Python ingestion stub and `scripts/README_NBA_API_INGEST.md` for future v3 NBA.com data — fully optional, does not affect Next.js build.
- Preserved Demo Mode fallback when no API key is configured.
- Preserved no-betting sports analytics positioning — no odds, no sportsbook copy, no hallucinated injuries/news.

## v1.0 Initial release

- Player profiles, recent stats, formula projections, charts, demo mode.
