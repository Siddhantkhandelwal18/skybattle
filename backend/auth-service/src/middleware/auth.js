// SKYBATTLE — JWT Auth Middleware
// Validates Bearer token on protected routes
'use strict';

const { verifyAccessToken } = require('../utils/jwt');

function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authorization header required' });
    }

    const token = authHeader.substring(7);
    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired access token' });
    }
}

module.exports = { authenticate };
