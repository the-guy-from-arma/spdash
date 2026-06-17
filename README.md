# Thunder Buddies Studios Showcase

Railway-ready public website and PWA for Thunder Buddies Studios, focused on Arma Reforger mods, the upcoming Midway-inspired modern pack, launch countdowns, videos, Workshop links, and Discord community growth.

The public experience now focuses on the studio showcase, community funnel, and installable PWA shell.

## What This Serves

```text
/
  Thunder Buddies Studios showcase site
  PWA manifest and service worker
  animated studio entrance
  Reforger mod cards
  mission-brief slide section
  Midway pack countdown
  video / Discord / Workshop links

/admin/
  optional owner login shell
  legacy registry tools remain available only if Postgres is configured
```

The showcase can run without a database. If `DATABASE_URL` is not set, public pages and `/health` still work. Legacy admin/API registry endpoints return `database_not_configured` until a database is attached.

## Deploy On Railway

1. Push this folder to GitHub.
2. Create or update the Railway service from the GitHub repo.
3. Set the service root to `backend`.
4. Railway will build the Dockerfile in `backend/`.
5. Set only the variables you need:

```text
PORT=8080
PUBLIC_BASE_URL=https://spdash-production.up.railway.app
ADMIN_TOKEN=<long random cookie signing secret>
ADMIN_USERNAME=owner
ADMIN_PASSWORD=<owner dashboard password>
```

Optional legacy registry variables:

```text
DATABASE_URL=<Railway Postgres URL>
DATABASE_SSL=false
SERVER_TTL_SECONDS=300
ALLOW_PENDING_SERVERS=false
```

For the owner password you mentioned, set:

```text
ADMIN_PASSWORD=Google1595!
```

## PWA Files

```text
backend/src/public/site/manifest.webmanifest
backend/src/public/site/service-worker.js
backend/src/public/site/offline.html
backend/src/public/site/assets/tbs-emblem.svg
backend/src/public/site/assets/showcase/
```

The install button appears automatically when the browser fires the PWA install prompt.

## Showcase Deck

The public page uses the provided Mid Pacific Naval Theater work-in-progress images as:

```text
TBMS logistics-style boot screen entry
hero background rotation
briefing slide carousel
scrollable showcase deck
PWA offline cache assets
```

The copied image assets are:

```text
mid-pacific-reveal.png
naval-gap.png
goal-change.png
living-battlefield.png
fleet-operations.png
progress-updates.png
```

## Content To Swap Later

The current Workshop cards point at the official Arma Reforger Workshop landing page until exact Thunder Buddies mod URLs are available.

The launch countdown target is set in:

```text
backend/src/public/site/index.html
```

Look for:

```html
data-launch-date="2026-09-01T20:00:00-04:00"
```

The current hero uses Steam-hosted Arma Reforger artwork as visual reference. Replace those URLs in `styles.css` when custom Thunder Buddies footage or B-roll is ready.

## Local Docker Test

```powershell
docker compose up --build
```

Then open:

```text
http://localhost:8080/
```
