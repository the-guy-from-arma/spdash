import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

function safeEqualText(a, b) {
  const left = Buffer.from(a || "", "utf8");
  const right = Buffer.from(b || "", "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function readAdminToken(req) {
  const auth = req.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return req.get("x-admin-token") || req.query.adminToken || "";
}

export function requireAdmin(req, res, next) {
  const token = readAdminToken(req);
  if (!config.adminToken || !safeEqualText(token, config.adminToken)) {
    res.status(401).json({ error: "admin_token_required" });
    return;
  }
  next();
}

