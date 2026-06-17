import express from "express";
import { fileURLToPath } from "node:url";
import { config, requireRuntimeConfig } from "./config.js";
import { closeDb, databaseConfigured, migrate, query } from "./db.js";
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  hasValidAdminSession,
  isValidAdminLogin,
  requireAdmin
} from "./auth.js";
import { cleanCount, cleanText, validateHeartbeat } from "./validation.js";
import { workshopCatalog, workshopCatalogSource } from "./workshop-catalog.js";

requireRuntimeConfig();

const app = express();
const adminStaticPath = fileURLToPath(new URL("./public/admin", import.meta.url));
const siteStaticPath = fileURLToPath(new URL("./public/site", import.meta.url));

app.disable("x-powered-by");
app.set("trust proxy", true);
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

app.get("/health", async (req, res) => {
  if (!databaseConfigured) {
    res.json({
      ok: true,
      mode: "showcase",
      database: "not_configured"
    });
    return;
  }

  const result = await query("SELECT now() AS now");
  res.json({
    ok: true,
    now: result.rows[0].now,
    ttlSeconds: config.serverTtlSeconds
  });
});

app.get("/download", (req, res) => {
  res.redirect("/");
});

const products = workshopCatalog.map((mod) => ({
  ...mod,
  status: `v${mod.version}`,
  copy: `${formatWorkshopType(mod.type)} release by Thunder Buddies Studios. Updated ${formatCatalogDate(mod.updatedAt)}.`
}));

const radioTraffic = [
  "CIC reports surface contact bearing 042, range opening.",
  "Fleet command confirms weather front moving west across the operating area.",
  "Air tasking window green for reconnaissance pass.",
  "Amphibious corridor marked, escort package requested.",
  "Radar picket reports intermittent launch bloom beyond horizon.",
  "Project telemetry reports six-month launch clock active.",
  "QA channel reports bug triage board synchronized.",
  "Workshop catalog synchronized from official Thunder Buddies listings."
];

const fallbackProgress = {
  launchTargetAt: "2026-12-17T17:00:00.000Z",
  currentPhase: "Systems Integration",
  buildLabel: "TBMS WIP 0.0.1",
  progressPercent: 22,
  bugsFixed: 18,
  bugsRemaining: 42,
  shipsImported: 6,
  shipSystemsOnline: 4,
  aircraftProfiles: 3,
  scenariosReady: 2,
  testPasses: 11,
  blockers: 5,
  commanderNote: "Six-month production clock is active. Current work is focused on ship handling, weapons behavior, scenario structure, and clean public release pacing.",
  updatedAt: new Date().toISOString()
};

function publicProducts() {
  return products.map((product) => ({
    ...product,
    url: product.url,
    linkConfigured: true
  }));
}

async function publicProjectProgress() {
  if (!databaseConfigured) return fallbackProgress;
  const result = await query(
    `
      SELECT launch_target_at AS "launchTargetAt",
             current_phase AS "currentPhase",
             build_label AS "buildLabel",
             progress_percent AS "progressPercent",
             bugs_fixed AS "bugsFixed",
             bugs_remaining AS "bugsRemaining",
             ships_imported AS "shipsImported",
             ship_systems_online AS "shipSystemsOnline",
             aircraft_profiles AS "aircraftProfiles",
             scenarios_ready AS "scenariosReady",
             test_passes AS "testPasses",
             blockers,
             commander_note AS "commanderNote",
             updated_at AS "updatedAt"
      FROM project_progress
      WHERE id = 1
      LIMIT 1
    `
  );

  return result.rows[0] ? normalizeProgressForPublic(result.rows[0]) : fallbackProgress;
}

function normalizeProgressForPublic(progress) {
  return {
    launchTargetAt: toIso(progress.launchTargetAt) || fallbackProgress.launchTargetAt,
    currentPhase: progress.currentPhase || fallbackProgress.currentPhase,
    buildLabel: progress.buildLabel || fallbackProgress.buildLabel,
    progressPercent: cleanCount(progress.progressPercent, fallbackProgress.progressPercent, 0, 100),
    bugsFixed: cleanCount(progress.bugsFixed, fallbackProgress.bugsFixed, 0, 99999),
    bugsRemaining: cleanCount(progress.bugsRemaining, fallbackProgress.bugsRemaining, 0, 99999),
    shipsImported: cleanCount(progress.shipsImported, fallbackProgress.shipsImported, 0, 99999),
    shipSystemsOnline: cleanCount(progress.shipSystemsOnline, fallbackProgress.shipSystemsOnline, 0, 99999),
    aircraftProfiles: cleanCount(progress.aircraftProfiles, fallbackProgress.aircraftProfiles, 0, 99999),
    scenariosReady: cleanCount(progress.scenariosReady, fallbackProgress.scenariosReady, 0, 99999),
    testPasses: cleanCount(progress.testPasses, fallbackProgress.testPasses, 0, 99999),
    blockers: cleanCount(progress.blockers, fallbackProgress.blockers, 0, 99999),
    commanderNote: progress.commanderNote || fallbackProgress.commanderNote,
    updatedAt: toIso(progress.updatedAt) || new Date().toISOString()
  };
}

function normalizeProgressInput(body) {
  return {
    launchTargetAt: cleanLaunchTarget(body.launchTargetAt),
    currentPhase: cleanText(body.currentPhase, fallbackProgress.currentPhase, 80),
    buildLabel: cleanText(body.buildLabel, fallbackProgress.buildLabel, 80),
    progressPercent: cleanCount(body.progressPercent, fallbackProgress.progressPercent, 0, 100),
    bugsFixed: cleanCount(body.bugsFixed, fallbackProgress.bugsFixed, 0, 99999),
    bugsRemaining: cleanCount(body.bugsRemaining, fallbackProgress.bugsRemaining, 0, 99999),
    shipsImported: cleanCount(body.shipsImported, fallbackProgress.shipsImported, 0, 99999),
    shipSystemsOnline: cleanCount(body.shipSystemsOnline, fallbackProgress.shipSystemsOnline, 0, 99999),
    aircraftProfiles: cleanCount(body.aircraftProfiles, fallbackProgress.aircraftProfiles, 0, 99999),
    scenariosReady: cleanCount(body.scenariosReady, fallbackProgress.scenariosReady, 0, 99999),
    testPasses: cleanCount(body.testPasses, fallbackProgress.testPasses, 0, 99999),
    blockers: cleanCount(body.blockers, fallbackProgress.blockers, 0, 99999),
    commanderNote: cleanText(body.commanderNote, fallbackProgress.commanderNote, 700)
  };
}

function cleanLaunchTarget(value) {
  const fallback = new Date(fallbackProgress.launchTargetAt);
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatWorkshopType(value) {
  const labels = {
    SCENARIOS_MP: "Multiplayer scenario",
    MISC: "Utility / framework",
    TERRAINS: "Terrain",
    EFFECTS: "Effects",
    SYSTEMS: "Systems",
    CHARACTERS: "Character asset",
    VEHICLES: "Vehicle asset",
    WEAPONS: "Weapon asset"
  };
  if (labels[value]) return labels[value];
  return String(value || "Workshop")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCatalogDate(value) {
  if (!value) return "recently";
  return new Date(value).toISOString().slice(0, 10);
}

app.get("/api/showcase/config", async (req, res) => {
  res.json({
    workshopCatalogSource,
    products: publicProducts(),
    progress: await publicProjectProgress(),
    radio: radioTraffic
  });
});

app.get("/api/project/progress", async (req, res) => {
  res.json({ progress: await publicProjectProgress() });
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

app.get("/api/admin/progress", requireAdmin, async (req, res) => {
  res.json({
    databaseConfigured,
    progress: await publicProjectProgress()
  });
});

app.put("/api/admin/progress", requireAdmin, async (req, res) => {
  if (!databaseConfigured) {
    res.status(503).json({ error: "database_not_configured" });
    return;
  }

  const progress = normalizeProgressInput(req.body || {});
  const result = await query(
    `
      INSERT INTO project_progress (
        id, launch_target_at, current_phase, build_label, progress_percent,
        bugs_fixed, bugs_remaining, ships_imported, ship_systems_online,
        aircraft_profiles, scenarios_ready, test_passes, blockers,
        commander_note, updated_at
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
      ON CONFLICT (id)
      DO UPDATE SET
        launch_target_at = EXCLUDED.launch_target_at,
        current_phase = EXCLUDED.current_phase,
        build_label = EXCLUDED.build_label,
        progress_percent = EXCLUDED.progress_percent,
        bugs_fixed = EXCLUDED.bugs_fixed,
        bugs_remaining = EXCLUDED.bugs_remaining,
        ships_imported = EXCLUDED.ships_imported,
        ship_systems_online = EXCLUDED.ship_systems_online,
        aircraft_profiles = EXCLUDED.aircraft_profiles,
        scenarios_ready = EXCLUDED.scenarios_ready,
        test_passes = EXCLUDED.test_passes,
        blockers = EXCLUDED.blockers,
        commander_note = EXCLUDED.commander_note,
        updated_at = now()
      RETURNING launch_target_at AS "launchTargetAt",
                current_phase AS "currentPhase",
                build_label AS "buildLabel",
                progress_percent AS "progressPercent",
                bugs_fixed AS "bugsFixed",
                bugs_remaining AS "bugsRemaining",
                ships_imported AS "shipsImported",
                ship_systems_online AS "shipSystemsOnline",
                aircraft_profiles AS "aircraftProfiles",
                scenarios_ready AS "scenariosReady",
                test_passes AS "testPasses",
                blockers,
                commander_note AS "commanderNote",
                updated_at AS "updatedAt"
    `,
    [
      progress.launchTargetAt,
      progress.currentPhase,
      progress.buildLabel,
      progress.progressPercent,
      progress.bugsFixed,
      progress.bugsRemaining,
      progress.shipsImported,
      progress.shipSystemsOnline,
      progress.aircraftProfiles,
      progress.scenariosReady,
      progress.testPasses,
      progress.blockers,
      progress.commanderNote
    ]
  );

  res.json({ ok: true, progress: normalizeProgressForPublic(result.rows[0]) });
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
  if (err.status === 503 && err.message === "database_not_configured") {
    res.status(503).json({ error: "database_not_configured" });
    return;
  }
  res.status(500).json({ error: "internal_error" });
});

await migrate();

const server = app.listen(config.port, () => {
  console.log(`Thunder Buddies Studios site listening on ${config.port}`);
});

async function shutdown() {
  server.close();
  await closeDb();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
