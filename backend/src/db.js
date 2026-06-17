import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const databaseConfigured = Boolean(config.databaseUrl);

export const pool = databaseConfigured
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined
    })
  : null;

export async function migrate() {
  if (!pool) return false;
  const sql = await readFile(join(rootDir, "sql", "001_init.sql"), "utf8");
  await pool.query(sql);
  return true;
}

export async function query(text, params = []) {
  if (!pool) {
    const error = new Error("database_not_configured");
    error.status = 503;
    throw error;
  }
  return pool.query(text, params);
}

export async function closeDb() {
  if (!pool) return;
  await pool.end();
}
