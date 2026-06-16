import { createHash } from "node:crypto";

const MAX_TEXT = 160;
const IP_HEADER_SPLIT = ",";

export function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function clientIp(req) {
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(IP_HEADER_SPLIT)[0].trim();
  }
  return req.socket.remoteAddress || "0.0.0.0";
}

export function cleanText(value, fallback = "", max = MAX_TEXT) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, max);
}

export function cleanEnum(value, allowed, fallback) {
  if (typeof value !== "string") return fallback;
  return allowed.includes(value) ? value : fallback;
}

export function cleanPort(value) {
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return null;
  }
  return port;
}

export function cleanCount(value, fallback, min, max) {
  const count = Number.parseInt(value, 10);
  if (!Number.isFinite(count)) return fallback;
  return Math.min(max, Math.max(min, count));
}

export function validateHeartbeat(body, req) {
  const hostKey = cleanText(body.hostKey, "", 256);
  if (hostKey.length < 24) {
    return { error: "hostKey must be at least 24 characters" };
  }

  const port = cleanPort(body.port ?? 7777);
  if (!port) {
    return { error: "port must be between 1 and 65535" };
  }

  const publicIp = cleanText(body.publicIp, clientIp(req), 96);

  return {
    value: {
      hostKeyHash: sha256(hostKey),
      name: cleanText(body.name, "Unnamed Sea Power Server", 80),
      visibility: cleanEnum(body.visibility, ["public", "friends", "private"], "public"),
      mode: cleanEnum(body.mode, ["pvp", "coop"], "pvp"),
      transport: cleanEnum(body.transport, ["LiteNetLib", "Steam"], "LiteNetLib"),
      publicIp,
      port,
      pluginVersion: cleanText(body.pluginVersion || body.version, "unknown", 40),
      gameVersion: cleanText(body.gameVersion, "unknown", 80),
      scenarioName: cleanText(body.scenarioName || body.mission, "", 120) || null,
      scenarioHash: cleanText(body.scenarioHash, "", 128) || null,
      requiredMods: cleanRequiredMods(body.requiredMods),
      region: cleanText(body.region, "", 40) || null,
      playerCount: cleanCount(body.playerCount, 1, 0, 32),
      maxPlayers: cleanCount(body.maxPlayers, 2, 1, 32)
    }
  };
}

function cleanRequiredMods(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 80).map((mod) => {
    if (!mod || typeof mod !== "object") return null;
    const workshopId = cleanText(mod.workshopId || mod.id, "", 40);
    const name = cleanText(mod.name, workshopId ? `Workshop ${workshopId}` : "Unknown mod", 100);
    if (!workshopId && name === "Unknown mod") return null;

    return {
      name,
      workshopId: workshopId || null,
      required: mod.required !== false,
      version: cleanText(mod.version, "", 40) || null,
      hash: cleanText(mod.hash, "", 128) || null
    };
  }).filter(Boolean);
}
