# Thunder Buddies Studios Showcase

Railway-ready public website and PWA for Thunder Buddies Studios, centered on the Mid Pacific Naval Theater for Arma Reforger.

The public experience is now an official studio showcase: cinematic entrance, clean navigation, image showreel, six-month testing roadmap, Discord player login, personal station console, fleet-radio ticker, and PWA install support.

## What This Serves

```text
/
  official Thunder Buddies Studios showcase
  b-roll style entrance using the provided WIP artwork
  Mid Pacific Naval Theater hero
  cinematic thirteen-image slideshow
  official Workshop catalog with 44 published Thunder Buddies releases
  Discord-backed personal station drawer
  daily morale check-in
  question queue
  command postings and events feed
  six-month testing-to-community-release roadmap
  Discord community call-to-action
  PWA manifest, service worker, and offline shell

/admin/
  small footer login only
  hard owner/admin login only
  no Discord access for owner controls
  server review, community questions, and daily check-ins
```

The showcase can run without a database. If `DATABASE_URL` is not set, public pages and `/health` still work.
Discord questions, morale check-ins, official postings, and events require `DATABASE_URL` to persist across deploys.

## Deploy On Railway

1. Push this folder to GitHub.
2. Create or update the Railway service from the GitHub repo.
3. Set the service root to `backend`.
4. Railway will build the Dockerfile in `backend/`.
5. Set only the variables you need:

```text
PORT=8080
PUBLIC_BASE_URL=https://tb-studios.up.railway.app
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

Discord community drawer variables:

```text
DISCORD_CLIENT_ID=<Discord application/client ID>
DISCORD_CLIENT_SECRET=<Discord OAuth2 client secret>
DISCORD_PUBLIC_KEY=<Discord application public key>
DISCORD_REDIRECT_URI=https://tb-studios.up.railway.app/api/discord/callback
DISCORD_INVITE_URL=https://discord.gg/QsGMQh5hwz
COMMUNITY_SESSION_SECRET=<long random cookie signing secret>
```

For the current Discord app, use the application/client ID provided by the Discord developer portal. The public key is stored for future Discord interaction verification; the current login flow uses the client ID, client secret, and redirect URI.

Discord OAuth will fail with `Invalid OAuth2 redirect_uri` unless the Discord Developer Portal has this exact redirect listed under OAuth2 redirects:

```text
https://tb-studios.up.railway.app/api/discord/callback
```

## Workshop Catalog

The public Products section is no longer driven by placeholder environment variables. It uses `backend/src/workshop-catalog.js`, populated from the official Arma Reforger Workshop search for Thunder Buddies Studios:

```text
https://reforger.armaplatform.com/workshop?search=thunder+buddies+studios
```

Update that catalog file when new Workshop releases go live.

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
