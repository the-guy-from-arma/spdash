import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

const stateCookieName = "tbs_discord_state";
const sessionCookieName = "tbs_community";
const stateTtlSeconds = 10 * 60;
const sessionTtlSeconds = 60 * 60 * 24 * 30;
const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";

function secret() {
  return config.communitySessionSecret || config.adminToken || "local-community-session-secret";
}

function safeEqualText(a, b) {
  const left = Buffer.from(a || "", "utf8");
  const right = Buffer.from(b || "", "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function signPayload(payload) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodePayload(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodePayload(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
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

function createSignedCookie(name, payload, maxAge) {
  const encoded = encodePayload(payload);
  const signature = signPayload(encoded);
  const value = `${encoded}.${signature}`;
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax${secureCookie}; Path=/; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return `${name}=; HttpOnly; SameSite=Lax${secureCookie}; Path=/; Max-Age=0`;
}

function readSignedCookie(req, name) {
  const token = parseCookies(req).get(name);
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!safeEqualText(signature, signPayload(payload))) return null;

  try {
    const data = decodePayload(payload);
    if (typeof data.exp !== "number" || data.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function createDiscordStateCookie() {
  const state = randomBytes(18).toString("base64url");
  const cookie = createSignedCookie(stateCookieName, {
    state,
    exp: Math.floor(Date.now() / 1000) + stateTtlSeconds
  }, stateTtlSeconds);
  return { state, cookie };
}

export function validateDiscordState(req, returnedState) {
  const data = readSignedCookie(req, stateCookieName);
  return Boolean(data?.state && returnedState && safeEqualText(data.state, returnedState));
}

export function clearDiscordStateCookie() {
  return clearCookie(stateCookieName);
}

export function createCommunitySessionCookie(user) {
  return createSignedCookie(sessionCookieName, {
    discordId: user.discordId,
    username: user.username,
    globalName: user.globalName || "",
    avatarUrl: user.avatarUrl || "",
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds
  }, sessionTtlSeconds);
}

export function readCommunitySession(req) {
  return readSignedCookie(req, sessionCookieName);
}

export function clearCommunitySessionCookie() {
  return clearCookie(sessionCookieName);
}

export function requireCommunity(req, res, next) {
  const session = readCommunitySession(req);
  if (!session) {
    res.status(401).json({ error: "discord_login_required" });
    return;
  }
  req.communityUser = session;
  next();
}

export function discordAvatarUrl(discordUser) {
  if (!discordUser?.id || !discordUser?.avatar) return "";
  const extension = discordUser.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${extension}?size=128`;
}
