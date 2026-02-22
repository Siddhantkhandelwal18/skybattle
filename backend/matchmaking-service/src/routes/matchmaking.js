// SKYBATTLE — Matchmaking Routes
// POST /v1/matchmaking/join
// DELETE /v1/matchmaking/leave
// GET  /v1/matchmaking/status

'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { Pool } = require('pg');

const router = express.Router();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

const QUEUE_KEY = 'matchmaking:queue';
const QUEUE_PLAYER_KEY = (userId) => `matchmaking:player:${userId}`;

function authenticate(req, res, next) {
    const token = req.headers['authorization']?.substring(7);
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });
    try {
        req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
}

// ── POST /join ────────────────────────────────────────────────────────────────
router.post('/join', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;
        const { game_mode = 'FFA', region = 'ap-south-1' } = req.body;

        // Fetch ELO from DB
        const statsResult = await pool.query(
            `SELECT elo_rating FROM player_stats WHERE user_id = $1`, [userId]
        );
        if (statsResult.rows.length === 0) {
            return res.status(404).json({ error: 'PLAYER_NOT_FOUND' });
        }
        const elo = statsResult.rows[0].elo_rating;

        // Add to Redis sorted set — score = ELO
        const now = Date.now();
        const playerData = JSON.stringify({ userId, elo, game_mode, region, joined_at: now });

        await redis.zadd(QUEUE_KEY, elo, userId);
        await redis.setex(QUEUE_PLAYER_KEY(userId), 120, playerData);

        return res.status(202).json({
            status: 'QUEUED',
            elo,
            estimated_wait_seconds: 15,
        });
    } catch (err) {
        console.error('Matchmaking /join error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// ── DELETE /leave ─────────────────────────────────────────────────────────────
router.delete('/leave', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;
        await redis.zrem(QUEUE_KEY, userId);
        await redis.del(QUEUE_PLAYER_KEY(userId));
        return res.status(204).send();
    } catch (err) {
        console.error('Matchmaking /leave error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// ── GET /status ───────────────────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;
        const rank = await redis.zrank(QUEUE_KEY, userId);
        const isQueued = rank !== null;

        if (!isQueued) {
            return res.json({ status: 'NOT_QUEUED' });
        }

        const queueSize = await redis.zcard(QUEUE_KEY);

        // Check if match was found (stored by matchfinder)
        const matchKey = `matchmaking:matched:${userId}`;
        const matchData = await redis.get(matchKey);
        if (matchData) {
            await redis.del(matchKey);
            return res.json({ status: 'MATCH_FOUND', match: JSON.parse(matchData) });
        }

        return res.json({
            status: 'SEARCHING',
            queue_position: rank + 1,
            queue_total: queueSize,
        });
    } catch (err) {
        console.error('Matchmaking /status error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

module.exports = router;
