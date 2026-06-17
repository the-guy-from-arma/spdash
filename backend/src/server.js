import express from "express";
import { fileURLToPath } from "node:url";
import { config, requireRuntimeConfig } from "./config.js";
import {
  clearCommunitySessionCookie,
  clearDiscordStateCookie,
  createCommunitySessionCookie,
  createDiscordStateCookie,
  discordAvatarUrl,
  readCommunitySession,
  requireCommunity,
  validateDiscordState
} from "./community-auth.js";
import { closeDb, databaseConfigured, migrate, query } from "./db.js";
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  hasValidAdminSession,
  isValidAdminLogin,
  requireAdmin
} from "./auth.js";
import { cleanEnum, cleanText, validateHeartbeat } from "./validation.js";
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
  "Logistics channel requests daily check-in from all station members.",
  "Workshop catalog synchronized from official Thunder Buddies listings."
];

const fallbackPosts = [
  {
    category: "command post",
    title: "Welcome aboard TBMS",
    body: "The Community Net is live. Discord sign-in opens a personal station with questions, check-ins, events, and studio postings.",
    postedAt: new Date().toISOString()
  },
  {
    category: "development",
    title: "Theater scope is being locked",
    body: "Current focus is ship roles, aircraft tasking, sea-lane purpose, and a clean first public release path.",
    postedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    category: "testing",
    title: "Closed test prep",
    body: "Early test windows will prioritize stability, readable naval objectives, and the first pass of player feedback.",
    postedAt: new Date(Date.now() - 172800000).toISOString()
  }
];

const fallbackEvents = [
  {
    title: "Discord Muster",
    eventType: "community",
    body: "Drop into the Discord, claim your station, and watch for the first tester role calls.",
    status: "scheduled",
    startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    linkUrl: config.discordInviteUrl
  },
  {
    title: "Systems Briefing",
    eventType: "briefing",
    body: "Short public brief covering ship pipeline, aviation goals, HOCAS profile expectations, and test priorities.",
    status: "scheduled",
    startsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    linkUrl: config.discordInviteUrl
  },
  {
    title: "Closed Ops Window",
    eventType: "test",
    body: "First closed operations window for invited community members once the vertical slice is ready.",
    status: "scheduled",
    startsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    linkUrl: config.discordInviteUrl
  }
];

function baseUrl(req) {
  if (config.publicBaseUrl) return config.publicBaseUrl.replace(/\/$/, "");
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${proto}://${req.get("host")}`;
}

function discordConfigured() {
  return Boolean(config.discordClientId && config.discordClientSecret);
}

function discordRedirectUri(req) {
  return config.discordRedirectUri || `${baseUrl(req)}/api/discord/callback`;
}

function publicProducts() {
  return products.map((product) => ({
    ...product,
    url: product.url,
    linkConfigured: true
  }));
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

app.get("/api/community/config", (req, res) => {
  res.json({
    discordConfigured: discordConfigured(),
    discordLoginUrl: "/api/discord/login",
    discordInviteUrl: config.discordInviteUrl,
    workshopCatalogSource,
    products: publicProducts(),
    radio: radioTraffic
  });
});

app.get("/api/community/radio", (req, res) => {
  res.json({ radio: radioTraffic });
});

app.get("/api/community/feed", async (req, res) => {
  if (!databaseConfigured) {
    res.json({ posts: fallbackPosts, events: fallbackEvents });
    return;
  }

  const [posts, events] = await Promise.all([
    query(
      `
        SELECT category, title, body, posted_at AS "postedAt"
        FROM community_posts
        WHERE status = 'published'
        ORDER BY posted_at DESC
        LIMIT 8
      `
    ),
    query(
      `
        SELECT title, event_type AS "eventType", body, status,
               starts_at AS "startsAt", ends_at AS "endsAt", link_url AS "linkUrl"
        FROM community_events
        WHERE status IN ('scheduled', 'live')
        ORDER BY starts_at NULLS LAST, created_at DESC
        LIMIT 8
      `
    )
  ]);

  res.json({
    posts: posts.rows.length ? posts.rows : fallbackPosts,
    events: events.rows.length ? events.rows : fallbackEvents
  });
});

app.get("/api/community/session", async (req, res) => {
  const session = readCommunitySession(req);
  if (!session) {
    res.json({
      authenticated: false,
      discordConfigured: discordConfigured(),
      databaseConfigured
    });
    return;
  }

  let checkedInToday = false;
  let questionCount = 0;
  let checkInCount = 0;
  let lastCheckIn = null;
  if (databaseConfigured) {
    const checkin = await query(
      `
        SELECT id, checkin_date AS "checkinDate", mood, morale_score AS "moraleScore", note, updated_at AS "updatedAt"
        FROM daily_checkins
        WHERE discord_id = $1
        ORDER BY checkin_date DESC
        LIMIT 1
      `,
      [session.discordId]
    );
    const questions = await query(
      "SELECT count(*)::int AS count FROM community_questions WHERE discord_id = $1",
      [session.discordId]
    );
    const checkins = await query(
      "SELECT count(*)::int AS count FROM daily_checkins WHERE discord_id = $1",
      [session.discordId]
    );
    lastCheckIn = checkin.rows[0] || null;
    checkedInToday = lastCheckIn?.checkinDate
      ? new Date(lastCheckIn.checkinDate).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
      : false;
    questionCount = questions.rows[0]?.count || 0;
    checkInCount = checkins.rows[0]?.count || 0;
  }

  res.json({
    authenticated: true,
    discordConfigured: discordConfigured(),
    databaseConfigured,
    user: {
      discordId: session.discordId,
      username: session.username,
      globalName: session.globalName,
      avatarUrl: session.avatarUrl
    },
    checkedInToday,
    questionCount,
    checkInCount,
    lastCheckIn
  });
});

app.get("/api/discord/login", (req, res) => {
  if (!discordConfigured()) {
    res.redirect(config.discordInviteUrl);
    return;
  }

  const { state, cookie } = createDiscordStateCookie();
  const params = new URLSearchParams({
    client_id: config.discordClientId,
    redirect_uri: discordRedirectUri(req),
    response_type: "code",
    scope: "identify",
    state
  });

  res.setHeader("Set-Cookie", cookie);
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/api/discord/callback", async (req, res) => {
  if (!discordConfigured()) {
    res.redirect("/?community=discord-not-configured");
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !validateDiscordState(req, state)) {
    res.setHeader("Set-Cookie", clearDiscordStateCookie());
    res.redirect("/?community=discord-state-failed");
    return;
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.discordClientId,
        client_secret: config.discordClientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: discordRedirectUri(req)
      })
    });

    if (!tokenResponse.ok) throw new Error("discord_token_exchange_failed");
    const token = await tokenResponse.json();

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!userResponse.ok) throw new Error("discord_user_fetch_failed");
    const discordUser = await userResponse.json();

    const user = {
      discordId: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name || discordUser.username,
      avatarUrl: discordAvatarUrl(discordUser)
    };

    if (databaseConfigured) {
      await query(
        `
          INSERT INTO community_users (discord_id, username, global_name, avatar_url, raw_profile, last_login, updated_at)
          VALUES ($1, $2, $3, $4, $5::jsonb, now(), now())
          ON CONFLICT (discord_id)
          DO UPDATE SET
            username = EXCLUDED.username,
            global_name = EXCLUDED.global_name,
            avatar_url = EXCLUDED.avatar_url,
            raw_profile = EXCLUDED.raw_profile,
            last_login = now(),
            updated_at = now()
        `,
        [user.discordId, user.username, user.globalName, user.avatarUrl, JSON.stringify(discordUser)]
      );
    }

    res.setHeader("Set-Cookie", [
      clearDiscordStateCookie(),
      createCommunitySessionCookie(user)
    ]);
    res.redirect("/?community=connected");
  } catch (error) {
    console.error(error);
    res.setHeader("Set-Cookie", clearDiscordStateCookie());
    res.redirect("/?community=discord-failed");
  }
});

app.post("/api/community/logout", (req, res) => {
  res.setHeader("Set-Cookie", clearCommunitySessionCookie());
  res.json({ ok: true });
});

app.post("/api/community/questions", requireCommunity, async (req, res) => {
  if (!databaseConfigured) {
    res.status(503).json({ error: "database_not_configured" });
    return;
  }

  const question = cleanText(req.body?.question, "", 900);
  if (question.length < 12) {
    res.status(400).json({ error: "question_too_short" });
    return;
  }

  const displayName = cleanText(
    req.communityUser.globalName || req.communityUser.username,
    "Discord user",
    80
  );
  const result = await query(
    `
      INSERT INTO community_questions (discord_id, display_name, question)
      VALUES ($1, $2, $3)
      RETURNING id, created_at AS "createdAt"
    `,
    [req.communityUser.discordId, displayName, question]
  );

  res.json({ ok: true, question: result.rows[0] });
});

app.post("/api/community/check-in", requireCommunity, async (req, res) => {
  if (!databaseConfigured) {
    res.status(503).json({ error: "database_not_configured" });
    return;
  }

  const mood = cleanEnum(
    req.body?.mood,
    ["green", "blue", "amber", "red", "gold", "on_station", "testing", "watching", "blocked", "other"],
    "green"
  );
  const moraleScore = Number.parseInt(req.body?.moraleScore, 10);
  const cleanMoraleScore = Number.isFinite(moraleScore)
    ? Math.min(5, Math.max(1, moraleScore))
    : null;
  const note = cleanText(req.body?.note, "", 300) || null;
  const result = await query(
    `
      INSERT INTO daily_checkins (discord_id, checkin_date, mood, morale_score, note, updated_at)
      VALUES ($1, current_date, $2, $3, $4, now())
      ON CONFLICT (discord_id, checkin_date)
      DO UPDATE SET mood = EXCLUDED.mood,
                    morale_score = EXCLUDED.morale_score,
                    note = EXCLUDED.note,
                    updated_at = now()
      RETURNING id, checkin_date AS "checkinDate", mood, morale_score AS "moraleScore", note
    `,
    [req.communityUser.discordId, mood, cleanMoraleScore, note]
  );

  res.json({ ok: true, checkIn: result.rows[0] });
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

app.get("/api/admin/community/questions", requireAdmin, async (req, res) => {
  const result = await query(
    `
      SELECT id, discord_id AS "discordId", display_name AS "displayName",
             question, status, created_at AS "createdAt"
      FROM community_questions
      ORDER BY created_at DESC
      LIMIT 120
    `
  );
  res.json({ questions: result.rows });
});

app.post("/api/admin/community/questions/:id/status", requireAdmin, async (req, res) => {
  const status = cleanEnum(req.body?.status, ["new", "reviewed", "answered", "archived"], "");
  if (!status) {
    res.status(400).json({ error: "invalid_status" });
    return;
  }

  const result = await query(
    `
      UPDATE community_questions
      SET status = $1
      WHERE id = $2
      RETURNING id, status
    `,
    [status, req.params.id]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ ok: true, question: result.rows[0] });
});

app.get("/api/admin/community/checkins", requireAdmin, async (req, res) => {
  const result = await query(
    `
      SELECT c.id, c.discord_id AS "discordId", u.global_name AS "globalName",
             u.username, c.checkin_date AS "checkinDate", c.mood,
             c.morale_score AS "moraleScore", c.note,
             c.created_at AS "createdAt", c.updated_at AS "updatedAt"
      FROM daily_checkins c
      LEFT JOIN community_users u ON u.discord_id = c.discord_id
      ORDER BY c.checkin_date DESC, c.updated_at DESC
      LIMIT 160
    `
  );
  res.json({ checkins: result.rows });
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
