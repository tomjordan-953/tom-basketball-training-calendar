#!/usr/bin/env python3
"""
CourtSight AI — optional NBA.com stats ingestion stub.

This script is OPTIONAL. CourtSight AI runs end-to-end without it.
It is provided as a starting point for v3+, where richer historical NBA.com
stats can be ingested via the unofficial `nba_api` package and then served to
the Next.js app through a generated JSON cache or a database table.

It is NOT required for `npm install`, `npm run dev`, or `npm run build`.

Usage (requires Python 3.10+ and `pip install nba_api`):

    python scripts/ingest-nba-api.py --player "Shai Gilgeous-Alexander" --season 2024

If `nba_api` is not installed, the script exits with a clear message instead of
crashing the rest of the project.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "nba-api-cache"


def ensure_nba_api():
    try:
        import nba_api  # noqa: F401
    except ImportError:
        print(
            "[ingest-nba-api] `nba_api` is not installed.\n"
            "Install it with `pip install nba_api` and re-run this script.\n"
            "This is OPTIONAL — CourtSight AI works without it.",
            file=sys.stderr,
        )
        sys.exit(1)


def fetch_player(name: str, season: int) -> dict:
    from nba_api.stats.static import players as static_players
    from nba_api.stats.endpoints import playercareerstats, playergamelog

    matches = static_players.find_players_by_full_name(name)
    if not matches:
        raise SystemExit(f"No NBA player found matching '{name}'")
    player = matches[0]
    pid = player["id"]

    career = playercareerstats.PlayerCareerStats(player_id=pid).get_normalized_dict()
    log = playergamelog.PlayerGameLog(player_id=pid, season=str(season)).get_normalized_dict()
    return {
        "player": player,
        "career": career,
        "gameLog": log,
        "season": season,
    }


def main():
    parser = argparse.ArgumentParser(description="Optional NBA.com ingestion for CourtSight AI")
    parser.add_argument("--player", required=True, help="Player full name")
    parser.add_argument("--season", type=int, default=2024, help="NBA season year (e.g. 2024)")
    parser.add_argument("--out", type=Path, default=OUTPUT_DIR, help="Output directory")
    args = parser.parse_args()

    ensure_nba_api()
    payload = fetch_player(args.player, args.season)

    args.out.mkdir(parents=True, exist_ok=True)
    safe = args.player.lower().replace(" ", "-")
    out_path = args.out / f"{safe}-{args.season}.json"
    with out_path.open("w") as f:
        json.dump(payload, f, indent=2, default=str)
    print(f"[ingest-nba-api] wrote {out_path}")


if __name__ == "__main__":
    main()
