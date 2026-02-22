// SKYBATTLE — Profile Routes
// GET  /v1/profile/me
// GET  /v1/profile/:user_id
// PATCH /v1/profile/me
// POST /v1/profile/me/sync-offline

'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { z } = require('zod');

const router = express.Router();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
});

// XP formula from doc 18: XP_for_level_N = 800 * (N ^ 1.6)
function xpRequiredForLevel(n) {
    return Math.floor(800 * Math.pow(n, 1.6));
}

function calculateLevel(totalXp) {
    let level = 1;
    let accumulated = 0;
    while (true) {
        const needed = xpRequiredForLevel(level);
        if (accumulated + needed > totalXp) break;
        accumulated += needed;
        level++;
        if (level >= 100) break;
    }
    return level;
}

// Middleware — authenticate Bearer token
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    try {
        req.user = jwt.verify(authHeader.substring(7), process.env.JWT_ACCESS_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }
}

// ── GET /me ───────────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.display_name, u.email, u.avatar_url, u.region,
              u.created_at, u.last_login_at, u.preferred_language,
              ps.elo_rating, ps.rank_tier, ps.total_matches, ps.total_wins,
              ps.total_kills, ps.total_deaths, ps.total_playtime_seconds,
              ps.coins, ps.xp, ps.level, ps.current_win_streak
       FROM users u
       JOIN player_stats ps ON u.user_id = ps.user_id
       WHERE u.user_id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        }

        const user = result.rows[0];
        const currentLevel = calculateLevel(user.xp);
        const xpForNextLevel = xpRequiredForLevel(currentLevel);
        const xpAtCurrentLevel = user.xp - (() => {
            let acc = 0;
            for (let i = 1; i < currentLevel; i++) acc += xpRequiredForLevel(i);
            return acc;
        })();

        const kd_ratio = user.total_deaths > 0
            ? (user.total_kills / user.total_deaths).toFixed(2)
            : user.total_kills > 0 ? user.total_kills.toFixed(2) : '0.00';

        return res.json({
            user_id: user.user_id,
            display_name: user.display_name,
            email: user.email,
            avatar_url: user.avatar_url,
            region: user.region,
            preferred_language: user.preferred_language,
            stats: {
                elo_rating: user.elo_rating,
                rank_tier: user.rank_tier,
                level: currentLevel,
                xp: user.xp,
                xp_in_current_level: xpAtCurrentLevel,
                xp_for_next_level: xpForNextLevel,
                coins: user.coins,
                total_matches: user.total_matches,
                total_wins: user.total_wins,
                win_rate: user.total_matches > 0
                    ? ((user.total_wins / user.total_matches) * 100).toFixed(1)
                    : '0.0',
                total_kills: user.total_kills,
                total_deaths: user.total_deaths,
                kd_ratio,
                total_playtime_seconds: user.total_playtime_seconds,
                current_win_streak: user.current_win_streak,
            },
        });
    } catch (err) {
        console.error('GET /me error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// ── GET /:user_id (public profile) ───────────────────────────────────────────

router.get('/:user_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.display_name, u.avatar_url, u.region, u.created_at,
              ps.elo_rating, ps.rank_tier, ps.total_matches, ps.total_wins,
              ps.total_kills, ps.total_deaths, ps.level
       FROM users u
       JOIN player_stats ps ON u.user_id = ps.user_id
       WHERE u.user_id = $1 AND u.is_banned = FALSE`,
            [req.params.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        }

        const user = result.rows[0];
        return res.json({
            user_id: user.user_id,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            region: user.region,
            member_since: user.created_at,
            stats: {
                level: user.level,
                elo_rating: user.elo_rating,
                rank_tier: user.rank_tier,
                total_matches: user.total_matches,
                total_wins: user.total_wins,
                total_kills: user.total_kills,
                total_deaths: user.total_deaths,
            },
        });
    } catch (err) {
        console.error('GET /:user_id error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// ── PATCH /me ─────────────────────────────────────────────────────────────────

const patchSchema = z.object({
    display_name: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
    region: z.enum(['ap-south-1', 'ap-southeast-1', 'us-east-1']).optional(),
    preferred_language: z.enum(['en', 'hi', 'id']).optional(),
    avatar_url: z.string().url().optional(),
    fcm_token: z.string().optional(),
});

router.patch('/me', authenticate, async (req, res) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(422).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'NO_CHANGES', message: 'No fields to update' });
    }

    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
    }
    values.push(req.user.userId);

    try {
        await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${idx}`,
            values
        );
        return res.json({ success: true });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'DISPLAY_NAME_TAKEN' });
        }
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// ── POST /me/sync-offline ─────────────────────────────────────────────────────

const syncSchema = z.object({
    offline_matches: z.array(z.object({
        map_id: z.string(),
        kills: z.number().int().min(0).max(50),
        deaths: z.number().int().min(0).max(50),
        playtime_seconds: z.number().int().min(60).max(600),
        xp_earned: z.number().int().min(0).max(500),
        coins_earned: z.number().int().min(0).max(200),
        played_at: z.string().datetime(),
    })).max(20),
});

router.post('/me/sync-offline', authenticate, async (req, res) => {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(422).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });
    }

    const { offline_matches } = parsed.data;
    if (offline_matches.length === 0) {
        return res.json({ synced: 0 });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let totalXp = 0, totalCoins = 0, totalKills = 0, totalDeaths = 0, totalPlaytime = 0;
        for (const m of offline_matches) {
            // Apply 60% offline XP rate as defined in doc 18
            const adjustedXp = Math.floor(m.xp_earned * 0.6);
            const adjustedCoins = Math.floor(m.coins_earned * 0.6);
            totalXp += adjustedXp;
            totalCoins += adjustedCoins;
            totalKills += m.kills;
            totalDeaths += m.deaths;
            totalPlaytime += m.playtime_seconds;
        }

        await client.query(
            `UPDATE player_stats 
       SET xp = xp + $1, coins = coins + $2, total_kills = total_kills + $3,
           total_deaths = total_deaths + $4, total_matches = total_matches + $5,
           total_playtime_seconds = total_playtime_seconds + $6
       WHERE user_id = $7`,
            [totalXp, totalCoins, totalKills, totalDeaths, offline_matches.length, totalPlaytime, req.user.userId]
        );

        // Recalculate level
        const statsResult = await client.query(
            `SELECT xp FROM player_stats WHERE user_id = $1`, [req.user.userId]
        );
        const newLevel = calculateLevel(statsResult.rows[0].xp);
        await client.query(
            `UPDATE player_stats SET level = $1 WHERE user_id = $2`,
            [newLevel, req.user.userId]
        );

        await client.query('COMMIT');

        return res.json({ synced: offline_matches.length, xp_credited: totalXp, coins_credited: totalCoins });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sync offline error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
        client.release();
    }
});

module.exports = router;
