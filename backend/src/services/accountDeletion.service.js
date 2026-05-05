import { pool } from "../config/db.js";

export const ACCOUNT_RESTORE_DAYS = 30;

export async function softDeleteAccount(username) {
  const result = await pool.query(
    `UPDATE users
     SET deleted_at = NOW(),
         delete_after = NOW() + ($2 || ' days')::interval,
         reset_password_token = NULL,
         reset_password_expires_at = NULL
     WHERE username = $1
       AND deleted_at IS NULL
     RETURNING username, deleted_at, delete_after`,
    [username, ACCOUNT_RESTORE_DAYS]
  );

  if (result.rowCount > 0) {
    await pool.query(
      "DELETE FROM rooms WHERE host = $1 OR players @> ARRAY[$1]::text[] OR ready_again @> ARRAY[$1]::text[]",
      [username]
    );
  }

  return result;
}

export async function restoreDeletedAccount(username) {
  const result = await pool.query(
    `UPDATE users
     SET deleted_at = NULL,
         delete_after = NULL
     WHERE username = $1
       AND deleted_at IS NOT NULL
       AND delete_after > NOW()
     RETURNING id, username, email, avatar`,
    [username]
  );

  return result;
}

export async function purgeExpiredDeletedAccounts() {
  const expired = await pool.query(
    `SELECT username
     FROM users
     WHERE deleted_at IS NOT NULL
       AND delete_after <= NOW()`
  );

  const usernames = expired.rows.map((row) => row.username);
  if (!usernames.length) {
    return 0;
  }

  await pool.query("DELETE FROM rooms WHERE host = ANY($1::text[]) OR players && $1::text[] OR ready_again && $1::text[]", [usernames]);
  await pool.query("DELETE FROM solo_scores WHERE username = ANY($1::text[])", [usernames]);
  await pool.query("DELETE FROM multiplayer_scores WHERE username = ANY($1::text[])", [usernames]);
  await pool.query("DELETE FROM coop_scores WHERE player_one = ANY($1::text[]) OR player_two = ANY($1::text[])", [usernames]);
  await pool.query("DELETE FROM users WHERE username = ANY($1::text[])", [usernames]);

  return usernames.length;
}
