import express from "express";
import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { getActiveGameCount } from "../game/gameManager.js";
import { getActiveUserCount, getPeakActiveUserCount } from "../socket/index.js";

const router = express.Router();

const toNumber = (value) => Number(value ?? 0);
const getAdminPassword = () => (process.env.ADMIN_PASSWORD || "").trim();

const passwordsMatch = (providedPassword, expectedPassword) => {
  const provided = Buffer.from(String(providedPassword || ""));
  const expected = Buffer.from(expectedPassword);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

router.get("/summary", async (req, res) => {
  try {
    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      return res.status(503).json({ error: "Admin password is not configured" });
    }

    const providedPassword = req.get("x-admin-password");
    if (!passwordsMatch(providedPassword, adminPassword)) {
      return res.status(401).json({ error: "Invalid admin password" });
    }

    const [
      overviewResult,
      monthResult,
      monthlyActivityResult,
      roomModesResult,
      recentRoomsResult,
      topSoloResult,
    ] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS registered_users,
          (SELECT COUNT(*) FROM rooms) AS total_rooms,
          (SELECT COUNT(*) FROM rooms WHERE status = 'waiting') AS waiting_rooms,
          (SELECT COUNT(*) FROM rooms WHERE status = 'started') AS started_rooms,
          (SELECT COALESCE(SUM(player_count), 0) FROM rooms) AS players_in_rooms,
          (SELECT COUNT(*) FROM solo_scores) AS solo_games,
          (SELECT COUNT(*) FROM multiplayer_scores) AS multiplayer_results,
          (SELECT COUNT(*) FROM coop_scores) AS coop_games,
          (
            (SELECT COALESCE(SUM(lines), 0) FROM solo_scores) +
            (SELECT COALESCE(SUM(lines), 0) FROM multiplayer_scores) +
            (SELECT COALESCE(SUM(lines), 0) FROM coop_scores)
          ) AS total_lines,
          (
            (SELECT COALESCE(SUM(tetris_count), 0) FROM solo_scores) +
            (SELECT COALESCE(SUM(tetris_count), 0) FROM multiplayer_scores) +
            (SELECT COALESCE(SUM(tetris_count), 0) FROM coop_scores)
          ) AS total_tetris
      `),
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users
           WHERE deleted_at IS NULL
             AND created_at >= date_trunc('month', NOW())) AS new_users,
          (SELECT COUNT(*) FROM rooms
           WHERE created_at >= date_trunc('month', NOW())) AS rooms_created,
          (SELECT COUNT(*) FROM solo_scores
           WHERE created_at >= date_trunc('month', NOW())) AS solo_games,
          (SELECT COUNT(*) FROM multiplayer_scores
           WHERE created_at >= date_trunc('month', NOW())) AS multiplayer_results,
          (SELECT COUNT(*) FROM coop_scores
           WHERE created_at >= date_trunc('month', NOW())) AS coop_games,
          (
            (SELECT COALESCE(SUM(lines), 0) FROM solo_scores
             WHERE created_at >= date_trunc('month', NOW())) +
            (SELECT COALESCE(SUM(lines), 0) FROM multiplayer_scores
             WHERE created_at >= date_trunc('month', NOW())) +
            (SELECT COALESCE(SUM(lines), 0) FROM coop_scores
             WHERE created_at >= date_trunc('month', NOW()))
          ) AS lines_cleared
      `),
      pool.query(`
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', NOW()) - INTERVAL '5 months',
            date_trunc('month', NOW()),
            INTERVAL '1 month'
          ) AS month_start
        ),
        solo AS (
          SELECT date_trunc('month', created_at) AS month_start, COUNT(*) AS games
          FROM solo_scores
          WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
          GROUP BY 1
        ),
        multi AS (
          SELECT date_trunc('month', created_at) AS month_start, COUNT(*) AS results
          FROM multiplayer_scores
          WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
          GROUP BY 1
        ),
        coop AS (
          SELECT date_trunc('month', created_at) AS month_start, COUNT(*) AS games
          FROM coop_scores
          WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
          GROUP BY 1
        )
        SELECT
          to_char(months.month_start, 'YYYY-MM') AS month,
          COALESCE(solo.games, 0) AS solo_games,
          COALESCE(multi.results, 0) AS multiplayer_results,
          COALESCE(coop.games, 0) AS coop_games
        FROM months
        LEFT JOIN solo USING (month_start)
        LEFT JOIN multi USING (month_start)
        LEFT JOIN coop USING (month_start)
        ORDER BY months.month_start ASC
      `),
      pool.query(`
        SELECT game_mode, COUNT(*) AS rooms, COALESCE(SUM(player_count), 0) AS players
        FROM rooms
        GROUP BY game_mode
        ORDER BY rooms DESC, game_mode ASC
      `),
      pool.query(`
        SELECT id, name, game_mode, status, player_count, is_listed, created_at
        FROM rooms
        ORDER BY created_at DESC, id DESC
        LIMIT 8
      `),
      pool.query(`
        SELECT username, score, lines, level, created_at
        FROM solo_scores
        ORDER BY score DESC, id ASC
        LIMIT 5
      `),
    ]);

    const overview = overviewResult.rows[0] || {};
    const month = monthResult.rows[0] || {};

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      live: {
        activePlayers: getActiveUserCount(),
        peakActivePlayers: getPeakActiveUserCount(),
        activeGames: getActiveGameCount(),
      },
      overview: {
        registeredUsers: toNumber(overview.registered_users),
        totalRooms: toNumber(overview.total_rooms),
        waitingRooms: toNumber(overview.waiting_rooms),
        startedRooms: toNumber(overview.started_rooms),
        playersInRooms: toNumber(overview.players_in_rooms),
        soloGames: toNumber(overview.solo_games),
        multiplayerResults: toNumber(overview.multiplayer_results),
        coopGames: toNumber(overview.coop_games),
        totalLines: toNumber(overview.total_lines),
        totalTetris: toNumber(overview.total_tetris),
      },
      currentMonth: {
        newUsers: toNumber(month.new_users),
        roomsCreated: toNumber(month.rooms_created),
        soloGames: toNumber(month.solo_games),
        multiplayerResults: toNumber(month.multiplayer_results),
        coopGames: toNumber(month.coop_games),
        linesCleared: toNumber(month.lines_cleared),
      },
      monthlyActivity: monthlyActivityResult.rows.map((row) => ({
        month: row.month,
        soloGames: toNumber(row.solo_games),
        multiplayerResults: toNumber(row.multiplayer_results),
        coopGames: toNumber(row.coop_games),
      })),
      roomModes: roomModesResult.rows.map((row) => ({
        mode: row.game_mode,
        rooms: toNumber(row.rooms),
        players: toNumber(row.players),
      })),
      recentRooms: recentRoomsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        mode: row.game_mode,
        status: row.status,
        playerCount: toNumber(row.player_count),
        listed: Boolean(row.is_listed),
        createdAt: row.created_at,
      })),
      topSoloScores: topSoloResult.rows.map((row) => ({
        username: row.username,
        score: toNumber(row.score),
        lines: toNumber(row.lines),
        level: toNumber(row.level),
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error("Admin summary failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
