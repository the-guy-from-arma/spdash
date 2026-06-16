import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config, requireRuntimeConfig } from "./config.js";
import { closeDb, migrate, query } from "./db.js";
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  hasValidAdminSession,
  isValidAdminLogin,
  requireAdmin
} from "./auth.js";
import { validateHeartbeat } from "./validation.js";

requireRuntimeConfig();

const app = express();
const adminStaticPath = fileURLToPath(new URL("./public/admin", import.meta.url));
const siteStaticPath = fileURLToPath(new URL("./public/site", import.meta.url));
const bundledLauncherPath = fileURLToPath(new URL("./public/downloads/SeaPowerMultiplayerLauncher.exe", import.meta.url));
const bundledLauncherName = "SeaPowerMultiplayerLauncher.exe";

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Admin-Token");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use("/admin", express.static(adminStaticPath));
app.use("/", express.static(siteStaticPath));

function publicBaseUrl(req) {
  return config.publicBaseUrl || `${req.protocol}://${req.get("host")}`;
}

function bundledLauncherAvailable() {
  return existsSync(bundledLauncherPath);
}

function launcherDownloadUrl(req) {
  if (config.launcherDownloadUrl) return config.launcherDownloadUrl;
  if (bundledLauncherAvailable()) return `${publicBaseUrl(req)}/download`;
  return "";
}

app.get("/health", async (req, res) => {
  const result = await query("SELECT now() AS now");
  res.json({
    ok: true,
    now: result.rows[0].now,
    ttlSeconds: config.serverTtlSeconds
  });
});

app.get("/api/launcher/latest", (req, res) => {
  const downloadUrl = launcherDownloadUrl(req);
  res.json({
    version: config.launcherVersion,
    downloadUrl,
    sha256: config.launcherSha256 || null,
    apiBaseUrl: publicBaseUrl(req),
    bundled: !config.launcherDownloadUrl && bundledLauncherAvailable()
  });
});

app.get("/download", (req, res) => {
  if (config.launcherDownloadUrl) {
    res.redirect(config.launcherDownloadUrl);
    return;
  }

  if (!bundledLauncherAvailable()) {
    res.status(404).send("Launcher download is not configured.");
    return;
  }

  res.download(bundledLauncherPath, bundledLauncherName);
});

app.get("/api/servers", async (req, res) => {
  const statuses = config.allowPendingServers ? ["verified", "pending"] : ["verified"];
  const result = await query(
    `
      SELECT id, name, visibility, mode, transport, public_ip AS "publicIp",
             port, plugin_version AS "pluginVersion", game_version AS "gameVersion",
             scenario_name AS "scenarioName", scenario_hash AS "scenarioHash",
             required_mods AS "requiredMods", region, player_count AS "playerCount",
             max_players AS "maxPlayers", status, last_seen AS "lastSeen"
      FROM servers
      WHERE visibility = 'public'
        AND status = ANY($1)
        AND last_seen > now() - ($2::text || ' seconds')::interval
      ORDER BY
        CASE WHEN status = 'verified' THEN 0 ELSE 1 END,
        last_seen DESC
      LIMIT 100
    `,
    [statuses, config.serverTtlSeconds]
  );

  res.json({
    ttlSeconds: config.serverTtlSeconds,
    servers: result.rows
  });
});

app.get("/api/servers/:id", async (req, res) => {
  const statuses = config.allowPendingServers ? ["verified", "pending"] : ["verified"];
  const result = await query(
    `
      SELECT id, name, visibility, mode, transport, public_ip AS "publicIp",
             port, plugin_version AS "pluginVersion", game_version AS "gameVersion",
             scenario_name AS "scenarioName", scenario_hash AS "scenarioHash",
             required_mods AS "requiredMods", region, player_count AS "playerCount",
             max_players AS "maxPlayers", status, last_seen AS "lastSeen"
      FROM servers
      WHERE id = $1
        AND visibility = 'public'
        AND status = ANY($2)
        AND last_seen > now() - ($3::text || ' seconds')::interval
      LIMIT 1
    `,
    [req.params.id, statuses, config.serverTtlSeconds]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "server_not_found_or_inactive" });
    return;
  }

  res.json({ server: result.rows[0] });
});

app.post("/api/servers/heartbeat", async (req, res) => {
  const parsed = validateHeartbeat(req.body || {}, req);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const server = parsed.value;
  const result = await query(
    `
      INSERT INTO servers (
        host_key_hash, name, visibility, mode, transport, public_ip, port,
        plugin_version, game_version, scenario_name, scenario_hash, required_mods,
        region, player_count, max_players, last_seen, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,now(),now())
      ON CONFLICT (host_key_hash)
      DO UPDATE SET
        name = EXCLUDED.name,
        visibility = EXCLUDED.visibility,
        mode = EXCLUDED.mode,
        transport = EXCLUDED.transport,
        public_ip = EXCLUDED.public_ip,
        port = EXCLUDED.port,
        plugin_version = EXCLUDED.plugin_version,
        game_version = EXCLUDED.game_version,
        scenario_name = EXCLUDED.scenario_name,
        scenario_hash = EXCLUDED.scenario_hash,
        required_mods = EXCLUDED.required_mods,
        region = EXCLUDED.region,
        player_count = EXCLUDED.player_count,
        max_players = EXCLUDED.max_players,
        last_seen = now(),
        updated_at = now()
      RETURNING id, status, last_seen AS "lastSeen"
    `,
    [
      server.hostKeyHash,
      server.name,
      server.visibility,
      server.mode,
      server.transport,
      server.publicIp,
      server.port,
      server.pluginVersion,
      server.gameVersion,
      server.scenarioName,
      server.scenarioHash,
      JSON.stringify(server.requiredMods),
      server.region,
      server.playerCount,
      server.maxPlayers
    ]
  );

  res.json({
    ok: true,
    serverId: result.rows[0].id,
    status: result.rows[0].status,
    lastSeen: result.rows[0].lastSeen
  });
});

app.post("/api/servers/:id/stop", async (req, res) => {
  const parsed = validateHeartbeat({ ...req.body, port: req.body?.port || 7777 }, req);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  await query(
    `
      UPDATE servers
      SET last_seen = now() - ($1::text || ' seconds')::interval,
          updated_at = now()
      WHERE id = $2 AND host_key_hash = $3
    `,
    [config.serverTtlSeconds + 60, req.params.id, parsed.value.hostKeyHash]
  );

  res.json({ ok: true });
});

app.get("/api/admin/session", (req, res) => {
  res.json({
    authenticated: hasValidAdminSession(req),
    loginConfigured: Boolean(config.adminPassword),
    username: config.adminUsername || "owner"
  });
});

app.post("/api/admin/login", (req, res) => {
  if (!config.adminPassword) {
    res.status(503).json({ error: "admin_password_not_configured" });
    return;
  }

  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!isValidAdminLogin(username, password)) {
    res.status(401).json({ error: "invalid_admin_login" });
    return;
  }

  res.setHeader("Set-Cookie", createAdminSessionCookie());
  res.json({ ok: true, username: config.adminUsername || "owner" });
});

app.post("/api/admin/logout", (req, res) => {
  res.setHeader("Set-Cookie", clearAdminSessionCookie());
  res.json({ ok: true });
});

app.get("/api/admin/servers", requireAdmin, async (req, res) => {
  const result = await query(
    `
      SELECT id, name, visibility, mode, transport, public_ip AS "publicIp",
             port, plugin_version AS "pluginVersion", game_version AS "gameVersion",
             scenario_name AS "scenarioName", scenario_hash AS "scenarioHash",
             required_mods AS "requiredMods", region, player_count AS "playerCount",
             max_players AS "maxPlayers", status, owner_note AS "ownerNote",
             last_seen AS "lastSeen", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM servers
      WHERE last_seen > now() - interval '48 hours'
         OR status IN ('pending', 'verified')
      ORDER BY last_seen DESC
      LIMIT 300
    `
  );
  res.json({ servers: result.rows });
});

app.post("/api/admin/servers/:id/status", requireAdmin, async (req, res) => {
  const status = req.body?.status;
  if (!["pending", "verified", "blocked"].includes(status)) {
    res.status(400).json({ error: "invalid_status" });
    return;
  }

  const note = typeof req.body?.ownerNote === "string"
    ? req.body.ownerNote.slice(0, 500)
    : null;

  const result = await query(
    `
      UPDATE servers
      SET status = $1,
          owner_note = COALESCE($2, owner_note),
          updated_at = now()
      WHERE id = $3
      RETURNING id, status, owner_note AS "ownerNote"
    `,
    [status, note, req.params.id]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  res.json({ ok: true, server: result.rows[0] });
});

app.delete("/api/admin/servers/:id", requireAdmin, async (req, res) => {
  await query("DELETE FROM servers WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

await migrate();

const server = app.listen(config.port, () => {
  console.log(`Sea Power MP Registry listening on ${config.port}`);
});

async function shutdown() {
  server.close();
  await closeDb();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
