// SKYBATTLE — Match History Routes (part of profile service)
'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

function authenticate(req, res, next) {
    const token = req.headers['authorization']?.substring(7);
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try { req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET); next(); }
    catch { return res.status(401).json({ error: 'UNAUTHORIZED' }); }
}

// POST /v1/matches — called by game server to record completed match
router.post('/', async (req, res) => {
    // Verify internal server secret
    const serverSecret = req.headers['x-server-secret'];
    if (serverSecret !== process.env.SERVER_SECRET) {
        return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { match_id, game_mode, map_id, server_region, started_at, ended_at, duration_seconds, players } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const matchResult = await client.query(
            `INSERT INTO matches (match_id, game_mode, map_id, server_region, started_at, ended_at, duration_seconds, player_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING match_id`,
            [match_id, game_mode, map_id, server_region || 'ap-south-1', started_at, ended_at, duration_seconds, players.length]
        );

        for (const p of players) {
            await client.query(
                `INSERT INTO match_players (match_id, user_id, team, kills, deaths, assists, damage_dealt, accuracy_pct, playtime_seconds, xp_earned, coins_earned, elo_change)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [match_id, p.user_id, p.team, p.kills, p.deaths, p.assists || 0, p.damage_dealt || 0, p.accuracy_pct || 0, duration_seconds, p.xp_earned, p.coins_earned, p.elo_change || 0]
            );

            // Update player stats
            await client.query(
                `UPDATE player_stats
         SET total_matches = total_matches + 1,
             total_wins = total_wins + $1,
             total_kills = total_kills + $2,
             total_deaths = total_deaths + $3,
             total_playtime_seconds = total_playtime_seconds + $4,
             xp = xp + $5,
             coins = coins + $6,
             elo_rating = GREATEST(0, elo_rating + $7)
         WHERE user_id = $8`,
                [p.won ? 1 : 0, p.kills, p.deaths, duration_seconds, p.xp_earned, p.coins_earned, p.elo_change || 0, p.user_id]
            );
        }

        await client.query('COMMIT');
        return res.status(201).json({ match_id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /matches error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
        client.release();
    }
});

// GET /v1/matches/history — player's match history
router.get('/history', authenticate, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '20'), 50);
    const page = Math.max(parseInt(req.query.page || '1'), 1);
    const offset = (page - 1) * limit;

    try {
        const result = await pool.query(
            `SELECT m.match_id, m.game_mode, m.map_id, m.started_at, m.duration_seconds,
              mp.kills, mp.deaths, mp.assists, mp.xp_earned, mp.coins_earned, mp.elo_change
       FROM match_players mp
       JOIN matches m ON mp.match_id = m.match_id
       WHERE mp.user_id = $1
       ORDER BY m.started_at DESC
       LIMIT $2 OFFSET $3`,
            [req.user.userId, limit, offset]
        );
        return res.json({ matches: result.rows, page, limit });
    } catch (err) {
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

module.exports = router;
