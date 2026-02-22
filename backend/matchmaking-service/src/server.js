// SKYBATTLE — Matchmaking Service
// Handles: queue join/leave/status, match finding via Redis, WebSocket push
// Port: 3002

'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const matchmakingRoutes = require('./routes/matchmaking');
const { startMatchFinder } = require('./jobs/matchFinder');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/v1/ws/matchmaking' });

const PORT = process.env.PORT || 3002;

app.use(express.json());
app.set('trust proxy', 1);

// Store WS connections keyed by userId for push notifications
global.wsClients = new Map();

wss.on('connection', (ws, req) => {
    // Clients send { type: 'AUTH', userId: '...' } on connect
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.type === 'AUTH' && data.userId) {
                ws.userId = data.userId;
                global.wsClients.set(data.userId, ws);
                ws.send(JSON.stringify({ type: 'AUTH_ACK' }));
            }
        } catch { /* ignore malformed */ }
    });
    ws.on('close', () => {
        if (ws.userId) global.wsClients.delete(ws.userId);
    });
});

app.use('/v1/matchmaking', matchmakingRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'matchmaking-service', timestamp: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

server.listen(PORT, () => {
    console.log(`🚀 Matchmaking Service running on http://localhost:${PORT}`);
    startMatchFinder();
});

module.exports = { app, server };
