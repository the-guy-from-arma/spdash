import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined
});

export async function migrate() {
  const sql = await readFile(join(rootDir, "sql", "001_init.sql"), "utf8");
  await pool.query(sql);
}

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function closeDb() {
  await pool.end();
}

