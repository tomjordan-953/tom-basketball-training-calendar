# Tom Basketball Training Dashboard

A static basketball training dashboard for Tom. It reads the current date and time, finds the right training block, and puts the most useful answer first: what to do now.

## Features

- Smart Now screen with current session, next session, timeline, current drill, and recovery/logging state.
- Mobile bottom navigation and desktop sidebar layout.
- Weekly plan, phase overview, exact calendar sessions, and session details.
- Drill completion, session actions, Plan B adjustments, Wednesday guided-training choice, and Thursday AM basketball branch.
- Progress graphs from saved logs and completion data.
- Log form for sleep, soreness, confidence, shooting, left-hand finishing, miss pattern, pain, and notes.
- Data tools for backup/export/import, CSV logs, plan export, and ChatGPT review pack.
- PWA metadata through `manifest.webmanifest` and `icon.svg`.

## Local Use

Open `index.html` directly in a browser.

Optional local server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Vercel Deployment

This is a static site with no build step.

Use these settings when importing the GitHub branch/repository into Vercel:

- Framework Preset: `Other`
- Root Directory: leave blank
- Build Command: leave blank
- Output Directory: `.`

After deployment, open the Vercel URL on Tom's phone and use the Data tab to import any existing backup.

## Data Storage

The app stores training data in the browser with `localStorage`. Data stays on the same browser, device, and domain. Moving to a new Vercel URL, a new phone, or a different browser requires exporting a backup from the Data tab and importing it again.

## Future Upgrades

- Supabase or Firebase login and cross-device sync.
- Cloud backups.
- Coach mode.
- Video upload/checklist.
- More advanced progress charts.
