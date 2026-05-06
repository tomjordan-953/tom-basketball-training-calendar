# Tom Basketball Training Calendar

Smart mobile-first basketball training assistant for Tom. The app detects the current date and time, reads the training calendar, and puts the most useful answer first: what Tom should do right now.

## Key Features

- Smart Now screen with current session, next session, missed-session guidance, and post-training reminders.
- Time engine for exact daily blocks, including active drill calculation based on elapsed session minutes.
- Today timeline with completed, now, next, missed, later, optional, and recovery statuses.
- Thursday AM basketball ON/OFF toggle saved per Thursday date.
- Plan B drawer for court busy, rain, darkness, low sleep, high soreness, and Thursday branch changes.
- Collapsed drill cards with exact instructions, cues, tracking, mistakes, easier and harder versions.
- Mobile bottom navigation and desktop planner layout with a side timeline and weekly stats.
- Logging for sleep, soreness, confidence, energy, shooting stats, left-hand finishing, miss pattern, pain warning, best drill, worst problem, and notes.
- Data Backup tab with cross-device copy/import, backup download, logs CSV, plan JSON, settings, and ChatGPT review pack.
- Basic PWA metadata with `manifest.webmanifest` and an SVG app icon.

## Data And Settings

The app stores data in browser `localStorage`.

Saved data includes:

- completed days
- completed sessions
- completed drills
- logs
- Thursday branch settings
- app settings
- full plan data in exports

Settings include:

- Thursday AM basketball default
- preferred Sunday start time
- sleep warning threshold
- soreness warning threshold
- court travel time
- theme: system, light, or dark

## Cross-Device Saving

This is still a static site, so automatic sync across phones/browsers needs a backend later, such as Supabase or Firebase.

Manual cross-device flow:

1. Open Data.
2. Tap `Copy Cross-Device Save` or `Download Backup`.
3. Open the app on the other device.
4. Paste the save into the import box.
5. Tap `Import Pasted Save`.

Imports merge with existing data instead of wiping it.

## ChatGPT Review Pack

Use `Copy ChatGPT Review Pack` to copy Tom's athlete context, saved logs, settings, weekly stats, selected day, smart timeline data, and full plan data. Paste it into ChatGPT for a practical review of patterns and next-week adjustments.

## Local Use

Open `index.html` directly in a browser.

Optional local server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Render Static Site

Use these Render settings:

- Root Directory: leave blank
- Build Command: leave blank
- Publish Directory: `.`

Render should auto-deploy from GitHub after pushes to `main` if the static site is connected.

## GitHub Workflow

Repository:

```text
https://github.com/tomjordan-953/tom-basketball-training-calendar
```

Typical update flow:

```bash
git add .
git commit -m "Describe the change"
git push
```

## Future Upgrade Ideas

- Supabase login and automatic sync.
- Cloud backup history.
- Coach mode.
- Video upload and checklist review.
- Progress charts.
- More advanced offline service worker.
