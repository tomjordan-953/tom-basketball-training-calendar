# CourtSight AI changelog

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
