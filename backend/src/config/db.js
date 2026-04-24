import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export async function ensureSchema() {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
  `);

  await pool.query(`
    ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT TRUE;
  `);

  await pool.query(`
    UPDATE rooms
    SET is_listed = TRUE
    WHERE is_listed IS NULL;
  `);

  await pool.query(`
    ALTER TABLE rooms
      ALTER COLUMN is_listed SET NOT NULL;
  `);
}
