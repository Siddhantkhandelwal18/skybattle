// SKYBATTLE — Auth Service Entry Point
// Handles: register, login, refresh token, logout, guest sessions
// Port: 3001

'use strict';

require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// JSON body parsing
app.use(express.json());

// Trust proxy (Nginx in production)
app.set('trust proxy', 1);

// Global rate limit — 100 req/min on auth endpoints
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' }
});
app.use('/auth', limiter);

// Routes
app.use('/v1/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Auth Service running on http://localhost:${PORT}`);
});

module.exports = app;
