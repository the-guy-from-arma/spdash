import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

function safeEqualText(a, b) {
  const left = Buffer.from(a || "", "utf8");
  const right = Buffer.from(b || "", "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

const adminCookieName = "spmp_admin";
const sessionTtlSeconds = 60 * 60 * 12;
const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";

function base64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(payload) {
  return createHmac("sha256", config.adminToken).update(payload).digest("base64url");
}

function parseCookies(req) {
  const header = req.get("cookie") || "";
  const cookies = new Map();
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies.set(key, decodeURIComponent(value));
  }
  return cookies;
}

export function readAdminToken(req) {
  const auth = req.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return req.get("x-admin-token") || req.query.adminToken || "";
}

export function isValidAdminLogin(username, password) {
  const expectedUser = config.adminUsername || "owner";
  const expectedPassword = config.adminPassword || "";
  return Boolean(expectedPassword)
    && safeEqualText(username, expectedUser)
    && safeEqualText(password, expectedPassword);
}

export function createAdminSessionCookie() {
  const payload = base64Url(JSON.stringify({
    sub: config.adminUsername || "owner",
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds
  }));
  const signature = signPayload(payload);
  const value = `${payload}.${signature}`;
  return `${adminCookieName}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict${secureCookie}; Path=/; Max-Age=${sessionTtlSeconds}`;
}

export function clearAdminSessionCookie() {
  return `${adminCookieName}=; HttpOnly; SameSite=Strict${secureCookie}; Path=/; Max-Age=0`;
}

export function hasValidAdminSession(req) {
  const token = parseCookies(req).get(adminCookieName);
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqualText(signature, signPayload(payload))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.exp === "number" && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function requireAdmin(req, res, next) {
  const token = readAdminToken(req);
  const hasBearerToken = config.adminToken && safeEqualText(token, config.adminToken);
  if (!hasBearerToken && !hasValidAdminSession(req)) {
    res.status(401).json({ error: "admin_token_required" });
    return;
  }
  next();
}
