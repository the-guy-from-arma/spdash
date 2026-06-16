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
PUBLIC_BASE_URL=https://your-service.up.railway.app
SERVER_TTL_SECONDS=300
ALLOW_PENDING_SERVERS=false
LAUNCHER_VERSION=0.1.0
LAUNCHER_DOWNLOAD_URL=https://github.com/your-org/your-repo/releases/latest/download/SeaPowerMPDashboard.exe
```

Railway will build the Dockerfile in `backend/`.

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

The public site can show active verified public servers, link to `/download` for the latest desktop app, and open the installed desktop app with a custom protocol:

```text
seapowermp://connect?serverId=<server-id>&registry=https://registry.yourdomain.com
```

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
  "pluginVersion": "0.3.0",
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

The first build does not need the in-game overlay to browse public servers. The desktop app and website handle discovery.

The current multiplayer mod already has an in-game overlay. A later plugin update can connect that overlay to this registry by reading a local `registry-session.json` written by the desktop app, or by calling the registry API directly from the plugin. That overlay can show listing status, scenario/mod requirements, and connection health. Actual ship movement and tactical play remain inside Sea Power.

## Local Docker Test

```powershell
docker compose up --build
```

Then open:

```text
http://localhost:8080/admin
```
