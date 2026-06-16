# Sea Power MP Registry

Railway-ready backend for a Sea Power Multiplayer dashboard.

This service is not the game host. The host player's PC still launches Sea Power with the multiplayer mod installed. This backend stores recent host heartbeats, exposes a public server list, and gives the mod owner an admin dashboard to verify, block, or remove listings.

## Architecture

```text
Desktop dashboard
  -> installs/repairs the multiplayer mod
  -> launches Sea Power
  -> sends host heartbeats to Railway
  -> fetches public servers from Railway

Railway backend
  -> stores server listings in Postgres
  -> exposes /api/servers for clients
  -> exposes /admin for the owner

Sea Power multiplayer mod
  -> handles actual networking
  -> handles in-game ship movement and sync
```

## Deploy On Railway

1. Push this folder to GitHub.
2. Create a Railway project from the GitHub repo.
3. Set the service root to `backend`.
4. Add a Railway Postgres database.
5. Set these variables on the backend service:

```text
DATABASE_URL=<Railway Postgres URL>
ADMIN_TOKEN=<long random owner password/token>
ADMIN_USERNAME=owner
ADMIN_PASSWORD=<owner dashboard password>
PUBLIC_BASE_URL=https://your-service.up.railway.app
SERVER_TTL_SECONDS=300
ALLOW_PENDING_SERVERS=false
LAUNCHER_VERSION=0.4.1
LAUNCHER_DOWNLOAD_URL=
LAUNCHER_SHA256=C0684CCC7A472B42467F0475BBC89993DD0CCD30E3D88DA10AC9CEA9D7A1F006
```

Railway will build the Dockerfile in `backend/`.

`ADMIN_TOKEN` signs the dashboard session cookie and can still be used as a bearer token for direct API calls. `ADMIN_USERNAME` and `ADMIN_PASSWORD` are the owner login credentials for `/admin/`.

If `LAUNCHER_DOWNLOAD_URL` is blank, `/download` serves the bundled file at:

```text
backend/src/public/downloads/SeaPowerMultiplayerLauncher.exe
```

Current bundled launcher SHA-256:

```text
C0684CCC7A472B42467F0475BBC89993DD0CCD30E3D88DA10AC9CEA9D7A1F006
```

This bundled executable is the registry-connected desktop launcher built from `desktop-launcher/`.

Later, you can move the launcher to GitHub Releases and set `LAUNCHER_DOWNLOAD_URL` to that release asset URL.

## How Clients Connect

The downloaded desktop dashboard does not connect to the Railway database directly. It connects to the public Railway API:

```text
GET  /api/servers
GET  /api/servers/:id
POST /api/servers/heartbeat
GET  /api/launcher/latest
```

The desktop app should store the API base URL in its own settings. On first launch it can default to `PUBLIC_BASE_URL`, then fetch `/api/launcher/latest` and `/api/servers`.

## Public Website

The same Railway service serves the public mod website at `/`.

The public site shows a cinematic Sea Power front page, active verified public servers, a `/download` button for the desktop app, and custom protocol links for the installed launcher:

```text
seapowermp://connect?serverId=<server-id>&registry=https://registry.yourdomain.com
```

The hero uses official Steam-hosted Sea Power media URLs and links back to the Steam community videos page for attribution/reference.

The website does not pass trusted IP details to the game. The desktop app must receive the custom protocol call, fetch `GET /api/servers/:id`, verify the server is still active, check local mod/scenario requirements, write the Sea Power multiplayer config, and launch the game.

## Heartbeat Metadata

Hosts should send enough metadata for clients to verify what they are joining:

```json
{
  "hostKey": "stable-random-secret-created-by-desktop-app",
  "name": "Cold War PvP",
  "publicIp": "203.0.113.10",
  "port": 7777,
  "mode": "pvp",
  "transport": "LiteNetLib",
  "pluginVersion": "0.4.1",
  "gameVersion": "Sea Power build/version",
  "scenarioName": "Operation Atomic Trident",
  "scenarioHash": "scenario-or-save-hash",
  "requiredMods": [
    {
      "name": "F/A-18C/D",
      "workshopId": "3457101198",
      "required": true
    }
  ],
  "visibility": "public"
}
```

## Host Flow

1. Dashboard detects Sea Power.
2. Dashboard checks mod install.
3. If missing, it prompts the player to install/repair.
4. Host clicks `Host Public Server`.
5. Dashboard writes the BepInEx config:

```ini
[Network]
Transport = LiteNetLib
IsHost = true
Port = 7777
AutoConnect = true
PvP = true
```

6. Dashboard launches Sea Power.
7. Dashboard sends heartbeat every 30-60 seconds to `/api/servers/heartbeat`.

## Client Flow

1. Dashboard fetches `/api/servers`.
2. Player clicks `Connect`.
3. Dashboard checks mod install.
4. If missing, it prompts the player to install/repair.
5. Dashboard writes:

```ini
[Network]
Transport = LiteNetLib
IsHost = false
HostIP = <selected host ip>
Port = <selected port>
AutoConnect = true
PvP = <server mode>
```

6. Dashboard launches Sea Power.
7. The existing mod auto-connects. Ship movement remains in-game.

## In-Game Overlay Integration

The multiplayer mod overlay has been patched to read this local handoff file from the BepInEx config folder:

```text
seapower-mp-registry-session.json
```

The desktop app should write the selected registry/server metadata there before launching Sea Power. The overlay can then show listing status, scenario/mod requirements, endpoint details, and connection health. Actual ship movement and tactical play remain inside Sea Power.

## Local Docker Test

```powershell
docker compose up --build
```

Then open:

```text
http://localhost:8080/admin
```
