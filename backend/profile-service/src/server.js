// SKYBATTLE — Profile Service
// Handles: player profiles, XP, level, coins, stats, offline sync
// Port: 3003

'use strict';

require('dotenv').config();
const express = require('express');
const profileRoutes = require('./routes/profile');
const matchRoutes = require('./routes/matches');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.set('trust proxy', 1);

app.use('/v1/profile', profileRoutes);
app.use('/v1/matches', matchRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'profile-service', timestamp: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

app.use((err, req, res, next) => {
    console.error('Profile service error:', err);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});

app.listen(PORT, () => console.log(`🚀 Profile Service running on http://localhost:${PORT}`));
module.exports = app;
