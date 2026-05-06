# Tom Basketball Training Dashboard

Smart basketball performance dashboard for Tom. It detects the current date and time, reads the training plan, and puts the most important answer first: what to do now.

## UI Overview

- **Now:** smart session card, action buttons, today timeline, current/next drill, branch choices, Plan B, and full session details.
- **Progress:** interactive SVG graphs from saved logs and completion data.
- **Plan:** weekly phase overview and exact calendar sessions.
- **Log:** session stats for sleep, soreness, confidence, shooting, left-hand finishing, miss pattern, pain, and notes.
- **Data:** backup/export/import, ChatGPT review pack, and settings.
- **Settings:** desktop sidebar shortcut for the same saved settings.

Mobile uses bottom navigation. Desktop uses a sidebar with a main panel and right dashboard panel, so it does not feel like a stretched phone app.

## Smart Now Screen

The app uses `new Date()` to calculate:

- current day and selected plan day
- active session
- next session
- missed sessions
- current drill inside an active session
- next drill
- session progress
- time until the next session
- time remaining in the active session

The Now card changes mode:

- calm when a session is more than 60 minutes away
- prep when it is 60-15 minutes away
- lock-in under 15 minutes away
- focus during the active session
- log/recovery after training

## Session Actions

Each session supports:

- **Start Session**
- **Complete**
- **Didn’t happen**
- **Skip**
- **Move +30m**
- **Move +1h**
- **Move custom**
- **Log**

These actions save to `localStorage` and update the Now card, timeline, weekly completion, exports, and ChatGPT pack.

## Branch System

Thursday has a clear branch choice saved by date:

- Yes, AM basketball is ON
- No, AM basketball is OFF

Wednesday has a guided-training check:

- Yes, completed guided training
- No, it did not happen

The app does not replace Wednesday guided training. It only adds the indoor extra.

## Plan B

Plan B asks what happened and gives exact alternatives for:

- court busy
- raining
- too dark
- slept under 7 hours
- soreness 7+
- no time
- other

Applying Plan B saves an adjustment for that day and includes it in exports.

## Progress Graphs

Progress uses saved logs and completion state.

Graph metrics:

- free throw percentage
- mid-range percentage
- three-point percentage
- left-hand finishing percentage
- confidence
- sessions completed
- drills completed
- sleep

Ranges:

- last 7 days
- current week
- all weeks

Tap or click a graph point to see the date, week, value, and change from the previous point. If there is not enough data, the app asks Tom to log 3 sessions first.

## Data And Storage

The app stores data in browser `localStorage`.

Saved/exported data includes:

- raw logs
- calculated weekly stats
- graph data summary
- completed days
- session completion
- drill completion
- Thursday branch choices
- Wednesday guided-training choices
- Plan B adjustments
- settings
- app version
- full plan data

Manual cross-device flow:

1. Open Data.
2. Tap `Copy Cross-Device Save` or `Download Backup`.
3. Open the app on the other device.
4. Paste the save into the import box.
5. Tap `Import Pasted Save`.

Imports merge with existing data instead of wiping it.

## ChatGPT Review Pack

Use `Copy ChatGPT Review Pack` to copy Tom’s context, saved logs, settings, session state, branch choices, Plan B adjustments, graph summaries, selected day, smart timeline data, and full plan data.

## Local Use

Open `index.html` directly in a browser.

Optional local server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Vercel Deployment

This project is Vercel-ready as a static site.

Use:

- Framework Preset: Other
- Root Directory: leave blank
- Build Command: leave blank
- Output Directory: `.`

Render static site settings are the same:

- Root Directory: leave blank
- Build Command: leave blank
- Publish Directory: `.`

## GitHub

Repository:

```text
https://github.com/tomjordan-953/tom-basketball-training-calendar
```

Update flow:

```bash
git add .
git commit -m "Describe the change"
git push
```

## Future Supabase Sync

Automatic cross-device saving should use Supabase or Firebase later.

Possible Supabase tables:

- `users`
- `logs`
- `completion`
- `settings`
- `plan_overrides`

For now, saving stays localStorage plus manual import/export.
