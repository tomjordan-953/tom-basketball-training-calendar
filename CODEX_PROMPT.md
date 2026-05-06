# Codex Prompt: Upgrade Tom Basketball Training Calendar into a Proper Web App

You are working on a basketball training tracker/calendar app for Tom, a 15-year-old student-athlete in Brisbane, Australia.

The current app is a single-file HTML tracker called:

`tom_basketball_v7_clean_exact_exportable.html`

Your job is to turn it into a much better, cleaner, more useful, deployable web app while preserving the core purpose: a targeted basketball development calendar that tells Tom exactly what to do each day.

## 1. Core user context

Tom is:
- 15 years old, turning 16 on July 14.
- Around 176–179 cm.
- Right-handed.
- Strong at defence, rebounding, effort, physicality.
- Weak at shooting consistency, shooting power, moving mid-ranges, threes, left-hand dribbling, left-hand finishing, scoring confidence, and getting to spots.
- Wants to become a #1 option style player.
- Inspired by Shai Gilgeous-Alexander, but the plan must adapt SGA-style concepts realistically for a developing guard/wing.
- Has AFL training Tuesday and Thursday afternoons.
- Sometimes has Thursday morning basketball training, sometimes not.
- Has guided training on Wednesdays, so the app should not replace that. It should only add an indoor extra session.
- Wants Saturday and Sunday to be hard development days.
- Sunday must be after 1 PM.
- Wants proper direction, not broad generic advice.

The current plan already includes:
- exact weekly progression
- exact session blocks
- drill check-off
- export all data
- export logs as CSV
- export plan as JSON
- import backup JSON
- localStorage persistence
- weekly phase progression
- calendar and week views
- quick logging
- collapsed drill cards with animation

Do not remove those features unless replacing them with something clearly better.

## 2. Main objective

Turn the single-file prototype into a polished, mobile-first training web app that Tom can actually use every day on his phone.

The app should feel like a clean mix of:
- Apple Calendar
- a sports training planner
- a habit tracker
- a simple performance dashboard

The app should be practical, fast, clean, and not cluttered.

## 3. Required technical direction

### Preferred build

Use a modern simple stack:

- Vite
- React
- TypeScript if reasonable
- Local storage first
- No paid services required
- No backend required for V1 unless you add optional future-ready structure
- Render Static Site deployment

Use clean components and file structure.

Suggested structure:

```text
src/
  app/
    App.tsx
  components/
    BottomNav.tsx
    CalendarView.tsx
    TodayView.tsx
    WeekView.tsx
    LogView.tsx
    DataView.tsx
    DrillCard.tsx
    SessionGroup.tsx
    StatCard.tsx
    Modal.tsx
  data/
    plan.ts
  lib/
    storage.ts
    export.ts
    date.ts
    analytics.ts
  styles/
    global.css
```

If you decide to keep it vanilla HTML/JS instead, that is allowed only if it significantly improves reliability and simplicity. Prefer React if you can do it cleanly.

## 4. Must-have features

### A. Cleaner UI

Improve the UI so it is not cluttered.

Requirements:
- Mobile-first.
- Bottom navigation.
- Today view is the default.
- Calendar view looks clean and easy to tap.
- Drill details are collapsed by default.
- Tapping a drill opens a smooth animated detail panel.
- Drill cards should show:
  - drill name
  - duration
  - short summary
  - check-off button
  - expand button
- Expanded drill details should show:
  - exactly what to do
  - main cues
  - what to track
  - common mistakes
  - easier version
  - harder version
- Recovery blocks should be visually marked as recovery, not training.
- Very High load days should be clearly labelled.
- The design should feel premium but simple.

### B. Drill detail upgrades

For every drill block, add structured fields:

```ts
{
  session: string;
  title: string;
  minutes: number;
  summary: string;
  how: string;
  cues: string;
  track: string;
  commonMistakes: string[];
  easierVersion: string;
  harderVersion: string;
  whyItMatters: string;
}
```

Do not leave vague lines like:
- “repeat the week’s main theme”
- “best-shot menu”
- “game-like reps”

unless you also define exactly what that means and what Tom should do.

### C. Better daily direction

For each day, include:
- exact session time
- session purpose
- intensity/load
- exact drill order
- exact reps, makes, attempts, sets, or rounds
- what to log
- when to cut volume
- what to do if the court is busy, raining, dark, or Tom is sore

Add a “Plan B” button for each day:
- Court busy
- Raining
- Too dark
- Legs sore
- Slept under 7 hours
- Thursday AM basketball is on/off

The Plan B button should open exact alternative instructions, not vague advice.

### D. Dashboard

Add a Dashboard tab or top section that shows:
- current week
- current phase
- days completed this week
- drills completed this week
- last logged sleep
- last logged soreness
- last logged confidence
- FT percentage
- mid-range percentage
- 3PT percentage
- warning if soreness is high or sleep is low

Use the saved logs to calculate:
- weekly sleep average
- weekly soreness average
- weekly confidence average
- weekly FT %
- weekly mid %
- weekly 3PT %

Keep it clean. Simple cards are enough.

### E. Logging upgrade

Add fields:
- session completed
- energy 1–10
- soreness 1–10
- confidence 1–10
- sleep hours
- FT made/attempted
- mid made/attempted
- 3PT made/attempted
- left-hand finishing made/attempted
- best drill today
- worst problem today
- shot miss pattern:
  - short
  - long
  - left
  - right
  - flat
  - rushed
- pain warning:
  - none
  - knee
  - shin
  - ankle
  - Achilles
  - back
  - other

If pain is selected, show a warning to reduce load and not push through sharp pain.

### F. Data export/import

Keep and improve:
- export all data JSON
- import backup JSON
- export logs CSV
- export plan JSON

Add:
- clear “Data Backup” view
- timestamped filenames
- user-friendly success messages
- validation when importing backup JSON
- do not wipe data accidentally

### G. Data persistence

Keep localStorage for now.

Use a storage version key like:

```ts
const STORAGE_VERSION = "tom-basketball-v8";
```

Build storage helpers so the app can later move to Supabase or Firebase without rewriting everything.

Data should survive page refresh and Render redeploy if the same domain/browser is used.

### H. Optional PWA support

Add:
- manifest
- app icon placeholders
- theme color
- mobile install support
- offline-friendly static app where possible

Do not spend too long on advanced service worker logic unless it is simple and reliable.

## 5. Training content requirements

Do not weaken the plan.

Tom said he is willing to work very hard. The app should still manage fatigue intelligently, but do not make everything light and easy.

Keep this structure:

### Monday
Main skill day after school:
- shooting power
- scoring mechanics
- left-hand finishing
- approach-jump technique
- free throws
- logging

### Tuesday
AM touch + AFL PM:
- short skill touch
- left-hand handles
- no junk volume before AFL

### Wednesday
Guided training + indoor extra:
- do his own guided training
- indoor extra after school/evening
- isometrics
- handles
- SGA-style footwork
- cooldown

### Thursday
AM basketball ON/OFF branch + AFL:
- if morning basketball is on, do that
- if morning basketball is off, light touch only
- AFL PM
- recovery block included but not counted as a training session

### Friday
Light touch + film:
- handles
- footwork
- SGA film note
- optional form reset
- stay fresh for Saturday

### Saturday
Hardest development day:
- early court
- midday indoor/non-court skill
- afternoon court
- recovery block shown in calendar but not counted as a session

### Sunday
After-1PM big court day:
- main court session 1:30–3:30 PM
- optional light touch at night
- recovery block shown in calendar but not counted as a session

## 6. Add a Drill Library

Create a Drill Library page.

It should include:
- shooting power drills
- form shooting
- rhythm ladder
- short-to-long ladder
- one-dribble pull-ups
- moving mid-range
- catch-and-shoot threes
- step-in threes
- left-hand handles
- left-hand finishing
- floaters
- SGA hesi/pace footwork
- deceleration and stops
- defence-to-offence
- rebound-to-push
- approach-jump technique
- plyos
- isometrics
- recovery stretch routine

Each library item should include:
- purpose
- exactly how to do it
- reps/sets
- cues
- common mistakes
- easier version
- harder version
- when to use it

## 7. Add Miss Diagnosis

Add a Miss Diagnosis tool.

User selects:
- short
- long
- left
- right
- flat
- rushed
- no power
- too much power
- guide hand push
- inconsistent legs

Then app shows:
- what it usually means
- 1 simple correction cue
- 1 drill to do next
- what not to change

Examples:
- Short: cue “lift first, wrist last”; drill close form + rhythm dip for 20 makes; do not throw harder with arms.
- Long: cue “slower dip, softer wrist”; drill same power different distance; do not aim lower randomly.

## 8. Add “What should I do now?”

This should be one of the most useful features.

Based on:
- current date
- current time
- selected plan day
- last log
- soreness
- sleep
- whether the day has multiple sessions

Show a card:
- “Do this now”
- “Next session”
- “Skip/cut volume warning”
- “What to prepare”

Example:
Saturday 12:05 PM:
- Next: Session 2 Midday Skill at 12:15
- Prepare: ball, water, phone
- Focus: isometrics + left handles + footwork
- Warning: if soreness 7+, cut afternoon court by 50%

## 9. GitHub instructions

After improving the app:

1. Initialise Git if needed.
2. Create a clean repository.
3. Commit the project with a meaningful commit message.
4. Push to GitHub.

Use a repo name like:

```text
tom-basketball-training-calendar
```

If GitHub remote is not set, create instructions for Tom to create a new GitHub repo manually, then provide:

```bash
git init
git add .
git commit -m "Build basketball training calendar app"
git branch -M main
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```

If GitHub CLI is available and authenticated, you may create the repo automatically:

```bash
gh repo create tom-basketball-training-calendar --public --source=. --remote=origin --push
```

Do not assume authentication exists. Check first.

## 10. Render deployment instructions

Make it deployable as a Render Static Site.

If using Vite:
- build command:

```bash
npm install && npm run build
```

or:

```bash
npm run build
```

depending on Render settings.

- publish directory:

```text
dist
```

Add a README section explaining:

1. Create account/log in to Render.
2. New + > Static Site.
3. Connect GitHub repo.
4. Choose repo.
5. Build command: `npm install && npm run build`
6. Publish directory: `dist`
7. Deploy.
8. Use the Render URL on phone.
9. Data stays in browser localStorage for that same site/domain.

If keeping vanilla HTML:
- publish directory should be the folder containing `index.html`
- build command can be empty or simple

Vite is preferred.

## 11. README requirements

Create a proper README with:
- what the app is
- key features
- local development steps
- deployment steps for Render
- data backup warning
- localStorage explanation
- future upgrade ideas:
  - Supabase login/sync
  - cloud backup
  - coach mode
  - video upload/checklist
  - progress charts

## 12. Quality bar

Before finishing:
- run the app locally
- check mobile layout
- check all tabs work
- check drill expand animation works
- check completion ticks save after refresh
- check log saves after refresh
- check export all JSON works
- check export CSV works
- check import backup works
- check no console errors
- check Render build would succeed

## 13. Do not break

Do not break:
- exact day calendar
- weekly progression
- mobile usability
- export/import
- localStorage
- Sunday after 1 PM
- Wednesday guided training + indoor extra
- Thursday AM on/off branch
- Saturday split day
- drill details
- check-off behaviour

## 14. Final response after coding

When done, provide:
- summary of changes
- files changed
- local run commands
- GitHub push status
- Render deployment instructions
- anything Tom needs to manually do
- warnings about localStorage data staying device/browser/domain-specific

Make the app feel like something Tom will actually open on his phone every day.
