// SKYBATTLE — Match Finder Background Job
// Runs every 2 seconds, groups players by ELO bracket, creates matches
// Implements ELO bracket expansion: starts at ±100, expands by ±50 every 10s

'use strict';

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const https = require('http');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const QUEUE_KEY = 'matchmaking:queue';
const TARGET_PLAYERS = 10;   // default match size (can be less for FFA)
const MIN_PLAYERS = 2;        // minimum to start a match
const TICK_INTERVAL_MS = 2000;
const MAX_RANK_SPREAD = parseInt(process.env.MAX_RANK_SPREAD || '200');
const EXPAND_RATE = parseInt(process.env.RANK_SPREAD_EXPAND_RATE || '50');
const EXPAND_INTERVAL_MS = parseInt(process.env.RANK_SPREAD_EXPAND_INTERVAL_MS || '10000');

function getBracketSpread(joinedAt) {
    const waitMs = Date.now() - joinedAt;
    const expansions = Math.floor(waitMs / EXPAND_INTERVAL_MS);
    return Math.min(100 + expansions * EXPAND_RATE, MAX_RANK_SPREAD);
}

async function notifyMatchFound(userId, matchInfo) {
    // 1. Store in Redis for polling clients
    await redis.setex(`matchmaking:matched:${userId}`, 60, JSON.stringify(matchInfo));

    // 2. Push via WebSocket if client is connected
    const ws = global.wsClients?.get(userId);
    if (ws && ws.readyState === 1) { // OPEN
        ws.send(JSON.stringify({ type: 'MATCH_FOUND', data: matchInfo }));
    }
}

async function runMatchFinder() {
    try {
        const queueSize = await redis.zcard(QUEUE_KEY);
        if (queueSize < MIN_PLAYERS) return;

        // Get up to 50 players from the sorted set (lowest ELO first)
        const members = await redis.zrange(QUEUE_KEY, 0, 49, 'WITHSCORES');

        // Parse into player objects {userId, elo}
        const players = [];
        for (let i = 0; i < members.length; i += 2) {
            const userId = members[i];
            const elo = parseInt(members[i + 1]);
            const dataStr = await redis.get(`matchmaking:player:${userId}`);
            if (!dataStr) continue;
            const data = JSON.parse(dataStr);
            players.push({ userId, elo, joinedAt: data.joined_at, game_mode: data.game_mode });
        }

        // Sliding window grouping — group players within ELO spread
        const matched = new Set();

        for (let i = 0; i < players.length; i++) {
            if (matched.has(players[i].userId)) continue;
            const anchor = players[i];
            const spread = getBracketSpread(anchor.joinedAt);

            const group = players.filter(p =>
                !matched.has(p.userId) &&
                Math.abs(p.elo - anchor.elo) <= spread &&
                p.game_mode === anchor.game_mode
            ).slice(0, TARGET_PLAYERS);

            if (group.length >= MIN_PLAYERS) {
                // Found a match group!
                const matchId = uuidv4();
                const serverPort = 7001; // In production: Agones allocated port
                const serverIp = process.env.GAME_SERVER_IP || '127.0.0.1';

                const matchInfo = {
                    match_id: matchId,
                    game_mode: anchor.game_mode,
                    map_id: 'outpost', // Phase 1 — only Outpost map
                    server_ip: serverIp,
                    server_port: serverPort,
                    players: group.map(p => ({ user_id: p.userId, elo: p.elo })),
                };

                // Remove matched players from queue
                for (const p of group) {
                    await redis.zrem(QUEUE_KEY, p.userId);
                    await redis.del(`matchmaking:player:${p.userId}`);
                    matched.add(p.userId);
                    await notifyMatchFound(p.userId, matchInfo);
                }

                console.log(`✅ Match created: ${matchId} — ${group.length} players, mode: ${anchor.game_mode}`);
            }
        }
    } catch (err) {
        console.error('Match finder error:', err);
    }
}

function startMatchFinder() {
    console.log('🎯 Match finder started — running every 2s');
    setInterval(runMatchFinder, TICK_INTERVAL_MS);
}

module.exports = { startMatchFinder };
