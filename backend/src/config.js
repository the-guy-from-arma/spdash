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
  serverTtlSeconds: intEnv("SERVER_TTL_SECONDS", 300),
  allowPendingServers: boolEnv("ALLOW_PENDING_SERVERS", false),
  launcherVersion: process.env.LAUNCHER_VERSION || "0.1.0",
  launcherDownloadUrl: process.env.LAUNCHER_DOWNLOAD_URL || "",
  launcherSha256: process.env.LAUNCHER_SHA256 || ""
};

export function requireRuntimeConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (!config.adminToken) missing.push("ADMIN_TOKEN");
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
