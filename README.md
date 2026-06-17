# Thunder Buddies Studios Showcase

Railway-ready public website and PWA for Thunder Buddies Studios, centered on the Mid Pacific Naval Theater for Arma Reforger.

The public experience is now an official studio showcase: cinematic entrance, clean navigation, simple image slideshow, six-month testing roadmap, Discord link, and PWA install support.

## What This Serves

```text
/
  official Thunder Buddies Studios showcase
  b-roll style entrance using the provided WIP artwork
  Mid Pacific Naval Theater hero
  simple six-image slideshow
  six-month testing-to-community-release roadmap
  Discord community call-to-action
  PWA manifest, service worker, and offline shell

/admin/
  small footer login only
  optional owner/admin shell
```

The showcase can run without a database. If `DATABASE_URL` is not set, public pages and `/health` still work.

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
ADMIN_PASSWORD=<owner admin password>
```

Optional legacy registry variables:

```text
DATABASE_URL=<Railway Postgres URL>
DATABASE_SSL=false
SERVER_TTL_SECONDS=300
ALLOW_PENDING_SERVERS=false
```

## PWA Files

```text
backend/src/public/site/manifest.webmanifest
backend/src/public/site/service-worker.js
backend/src/public/site/offline.html
backend/src/public/site/assets/tbs-emblem.svg
backend/src/public/site/assets/showcase/
```

## Showcase Images

The provided images are copied into:

```text
backend/src/public/site/assets/showcase/
```

They are used for:

```text
entrance b-roll effect
hero background rotation
simple slideshow
PWA offline cache
```

## Local Docker Test

```powershell
docker compose up --build
```

Then open:

```text
http://localhost:8080/
```
