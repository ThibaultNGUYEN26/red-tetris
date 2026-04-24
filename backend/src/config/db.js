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
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_password_token TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
    ON users (LOWER(email))
    WHERE email IS NOT NULL;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_reset_password_token_unique_idx
    ON users (reset_password_token)
    WHERE reset_password_token IS NOT NULL;
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
