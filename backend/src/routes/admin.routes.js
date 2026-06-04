import express from "express";
import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { getActiveGameCount } from "../game/gameManager.js";
import { getActiveUserCount, getPeakActiveUserCount } from "../socket/index.js";

const router = express.Router();

const toNumber = (value) => Number(value ?? 0);
const DEFAULT_ADMIN_USERNAME = "Titi08";
const getAdminUsername = () => (process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).trim();
const getAdminPassword = () => (process.env.ADMIN_PASSWORD || "").trim();

const safeEqual = (providedValue, expectedValue) => {
  const provided = Buffer.from(String(providedValue || ""));
  const expected = Buffer.from(expectedValue);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

router.get("/summary", async (req, res) => {
  try {
    const adminUsername = getAdminUsername();
    const adminPassword = getAdminPassword();
    if (!adminUsername || !adminPassword) {
      return res.status(503).json({ error: "Admin credentials are not configured" });
    }

    const providedUsername = req.get("x-admin-username");
    const providedPassword = req.get("x-admin-password");
    const usernameMatches = safeEqual(providedUsername, adminUsername);
    const passwordMatches = safeEqual(providedPassword, adminPassword);
    if (!usernameMatches || !passwordMatches) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const [
      overviewResult,
      monthResult,
      monthlyActivityResult,
      roomModesResult,
      recentRoomsResult,
      topSoloResult,
      performanceResult,
      topPlayersResult,
      multiplayerInsightsResult,
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
      pool.query(`
        SELECT
          ROUND(AVG(score)) AS avg_solo_score,
          ROUND(AVG(lines)) AS avg_solo_lines,
          ROUND(AVG(level)) AS avg_solo_level,
          ROUND(AVG(duration_seconds)) AS avg_solo_duration,
          ROUND(AVG(tetris_count)) AS avg_solo_tetrises,
          MAX(score) AS max_solo_score,
          (SELECT ROUND(AVG(score)) FROM multiplayer_scores) AS avg_mp_score,
          (SELECT ROUND(AVG(lines_sent)) FROM multiplayer_scores) AS avg_lines_sent,
          (SELECT ROUND(AVG(duration_seconds)) FROM coop_scores) AS avg_coop_duration,
          (SELECT ROUND(AVG(score)) FROM coop_scores) AS avg_coop_score
        FROM solo_scores
      `),
      pool.query(`
        SELECT
          u.username,
          u.solo_games_played,
          u.highest_solo_score,
          u.multiplayer_wins,
          u.multiplayer_games_played,
          COALESCE(u.multiplayer_wins::float / NULLIF(u.multiplayer_games_played, 0), 0) AS win_rate
        FROM users u
        WHERE u.deleted_at IS NULL
          AND (u.solo_games_played > 0 OR u.multiplayer_games_played > 0)
        ORDER BY u.highest_solo_score DESC NULLS LAST
        LIMIT 8
      `),
      pool.query(`
        SELECT
          game_mode,
          COUNT(*) AS total_results,
          SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) AS total_winners,
          ROUND(AVG(score)) AS avg_score,
          ROUND(AVG(lines_sent)) AS avg_lines_sent,
          ROUND(AVG(duration_seconds)) AS avg_duration
        FROM multiplayer_scores
        GROUP BY game_mode
        ORDER BY total_results DESC
      `),
    ]);

    const overview = overviewResult.rows[0] || {};
    const month = monthResult.rows[0] || {};
    const perf = performanceResult.rows[0] || {};

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
      performance: {
        avgSoloScore: toNumber(perf.avg_solo_score),
        avgSoloLines: toNumber(perf.avg_solo_lines),
        avgSoloLevel: toNumber(perf.avg_solo_level),
        avgSoloDuration: toNumber(perf.avg_solo_duration),
        avgSoloTetrises: toNumber(perf.avg_solo_tetrises),
        maxSoloScore: toNumber(perf.max_solo_score),
        avgMpScore: toNumber(perf.avg_mp_score),
        avgLinesSent: toNumber(perf.avg_lines_sent),
        avgCoopScore: toNumber(perf.avg_coop_score),
        avgCoopDuration: toNumber(perf.avg_coop_duration),
      },
      topPlayers: topPlayersResult.rows.map((row) => ({
        username: row.username,
        soloGamesPlayed: toNumber(row.solo_games_played),
        highestSoloScore: toNumber(row.highest_solo_score),
        multiplayerWins: toNumber(row.multiplayer_wins),
        multiplayerGamesPlayed: toNumber(row.multiplayer_games_played),
        winRate: Math.round(Number(row.win_rate || 0) * 100),
      })),
      multiplayerInsights: multiplayerInsightsResult.rows.map((row) => ({
        mode: row.game_mode,
        totalResults: toNumber(row.total_results),
        avgScore: toNumber(row.avg_score),
        avgLinesSent: toNumber(row.avg_lines_sent),
        avgDuration: toNumber(row.avg_duration),
      })),
    });
  } catch (err) {
    console.error("Admin summary failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
