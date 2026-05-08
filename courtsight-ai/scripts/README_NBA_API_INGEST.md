# Optional NBA.com stats ingestion

This directory is **optional**. CourtSight AI works end-to-end without any of these scripts.

## When you might want it

`balldontlie` covers searches, profiles, season averages and recent stats well, but it does not expose richer historical or advanced NBA.com fields. If you want career-level multi-season aggregates, advanced stats, or shot-chart data later, you can ingest them via Python using the unofficial [`nba_api`](https://github.com/swar/nba_api) package and feed the JSON into a future provider.

## Requirements

- Python 3.10+
- `pip install nba_api`

The Next.js app does **not** import or run this script. It does not run during `npm install`, `npm run dev`, or `npm run build`. If Python or `nba_api` are missing, the rest of the project keeps working.

## Usage

```bash
python scripts/ingest-nba-api.py --player "Shai Gilgeous-Alexander" --season 2024
```

This writes a JSON snapshot to `data/nba-api-cache/<player>-<season>.json`.

## Roadmap to wire it up

- v3 plan: add a `nbaApiProvider.ts` that reads from `data/nba-api-cache/` (or a Postgres/SQLite table populated by this script) and implements the same `SportsDataProvider` interface as `demoProvider` and `balldontlieProvider`.
- Until then, treat this as a sketch — CourtSight will keep running with `balldontlie` in real-data mode and the bundled demo roster otherwise.

## Disclaimer

NBA.com stats are property of the NBA. Respect their terms of service and rate limits. This script is for personal/research use; do not redistribute scraped data.
