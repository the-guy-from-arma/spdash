import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
loadDotEnv(join(backendRoot, ".env"));

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolEnv(name, fallback = false) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

export const config = {
  port: intEnv("PORT", 8080),
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: boolEnv("DATABASE_SSL", false),
  adminToken: process.env.ADMIN_TOKEN || "",
  adminUsername: process.env.ADMIN_USERNAME || "owner",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  discordClientId: process.env.DISCORD_CLIENT_ID || "",
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  discordPublicKey: process.env.DISCORD_PUBLIC_KEY || "",
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI || "",
  discordInviteUrl: process.env.DISCORD_INVITE_URL || "https://discord.gg/QsGMQh5hwz",
  communitySessionSecret: process.env.COMMUNITY_SESSION_SECRET || "",
  modProductOneUrl: process.env.MOD_PRODUCT_1_URL || "",
  modProductTwoUrl: process.env.MOD_PRODUCT_2_URL || "",
  modProductThreeUrl: process.env.MOD_PRODUCT_3_URL || "",
  serverTtlSeconds: intEnv("SERVER_TTL_SECONDS", 300),
  allowPendingServers: boolEnv("ALLOW_PENDING_SERVERS", false)
};

export function requireRuntimeConfig() {
  return true;
}
