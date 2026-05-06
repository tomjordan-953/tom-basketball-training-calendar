# Tom Basketball Training Calendar

Mobile-first basketball training calendar for Tom. It keeps the exact weekly plan, day branches, drill check-offs, logs, export/import tools, and a new portable save system.

## What Is Included

- Daily Today view with dashboard, current session guidance, Plan B instructions, and collapsed drill cards.
- Calendar and Weeks views for the full May-July plan.
- Upgraded logging for completion, energy, sleep, soreness, confidence, shooting stats, left-hand finishing, miss pattern, pain warning, best drill, worst problem, and notes.
- Data Backup tab for cross-device save transfer, full backup download, plan export, CSV log export, and ChatGPT review pack copy.
- Storage version key: `tom-basketball-v8`.

## Cross-Device Saving

This is still a static app, so it cannot automatically sync between phones or browsers without adding a login/database service such as Supabase or Firebase.

The current cross-device flow is:

1. On device A, open Data.
2. Tap `Copy Cross-Device Save` or `Download Backup`.
3. On device B, open the same app URL.
4. Paste the save into the Data import box.
5. Tap `Import Pasted Save`.

Imports merge with existing data instead of wiping it.

## ChatGPT Review Pack

Use `Copy ChatGPT Review Pack` when Tom wants feedback. It copies:

- Tom's athlete context and training constraints.
- Current selected day and week.
- Saved completion data.
- All training logs.
- Weekly shooting/sleep/soreness/confidence stats.
- The full calendar plan.

Paste that into ChatGPT and ask for a practical review of patterns, risks, and next-week actions.

## Local Use

Open `index.html` in a browser. No build step is required.

If you want to serve it locally:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Render Static Site

For the current vanilla HTML version:

- Build command: leave blank
- Publish directory: `.`

Steps:

1. Create or log in to Render.
2. Choose New + > Static Site.
3. Connect the GitHub repo.
4. Choose this project.
5. Leave the build command blank.
6. Set publish directory to `.`.
7. Deploy.
8. Open the Render URL on Tom's phone.

Data remains in browser `localStorage` for the same device, browser, and Render domain. Use the Data Backup tab before switching devices, browsers, or domains.

## Future Upgrade Ideas

- Supabase login and automatic sync.
- Cloud backup history.
- Coach mode.
- Video upload and checklist review.
- Progress charts.
- PWA manifest and install icons.
