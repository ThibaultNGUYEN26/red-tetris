import pkg from "pg";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

export const pool = new Pool(poolConfig);

export async function ensureSchema() {
  await runMigrations();
}

export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const migrationsDir = path.resolve(__dirname, "migrations");
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const applied = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [file]
    );

    if (applied.rowCount > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");

    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [file]
      );
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }
}
