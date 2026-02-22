// SKYBATTLE — JWT Utilities
'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db/client');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = parseInt(process.env.JWT_ACCESS_EXPIRY || '900');
const REFRESH_EXPIRY = parseInt(process.env.JWT_REFRESH_EXPIRY || '2592000');

function generateAccessToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function generateRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

function verifyAccessToken(token) {
    return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_SECRET);
}

async function storeRefreshToken(userId, token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY * 1000);
    await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );
}

async function invalidateRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await query(
        `UPDATE refresh_tokens 
     SET used = TRUE 
     WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()
     RETURNING user_id`,
        [tokenHash]
    );
    return result.rows[0] || null;
}

async function deleteAllUserTokens(userId) {
    await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    storeRefreshToken,
    invalidateRefreshToken,
    deleteAllUserTokens,
    ACCESS_EXPIRY,
};
