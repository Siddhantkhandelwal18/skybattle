// SKYBATTLE — Store Service
// Handles: item catalog, purchasing, inventory, skin equipping
// Port: 3004

'use strict';

require('dotenv').config();
const express = require('express');
const storeRoutes = require('./routes/store');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());
app.set('trust proxy', 1);

app.use('/v1/store', storeRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'store-service', timestamp: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

app.use((err, req, res, next) => {
    console.error('Store service error:', err);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});

app.listen(PORT, () => console.log(`🚀 Store Service running on http://localhost:${PORT}`));
module.exports = app;
