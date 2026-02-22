// SKYBATTLE — Auth Routes
// POST /v1/auth/register
// POST /v1/auth/login
// POST /v1/auth/refresh
// POST /v1/auth/logout
// POST /v1/auth/guest

'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');

const { query } = require('../db/client');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    storeRefreshToken,
    invalidateRefreshToken,
    deleteAllUserTokens,
    ACCESS_EXPIRY,
} = require('../utils/jwt');

const router = express.Router();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// ── Validation Schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
    display_name: z.string()
        .min(3, 'Display name must be at least 3 characters')
        .max(32, 'Display name must be at most 32 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Display name can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// ── POST /register ────────────────────────────────────────────────────────────

router.post('/register', async (req, res, next) => {
    try {
        // Validate input
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(422).json({
                error: 'VALIDATION_ERROR',
                message: 'Input validation failed',
                details: parsed.error.flatten().fieldErrors,
            });
        }

        const { display_name, email, password } = parsed.data;

        // Check for duplicate display_name
        const nameCheck = await query(
            `SELECT user_id FROM users WHERE LOWER(display_name) = LOWER($1)`,
            [display_name]
        );
        if (nameCheck.rows.length > 0) {
            return res.status(409).json({ error: 'DISPLAY_NAME_TAKEN', message: 'This display name is already taken' });
        }

        // Check for duplicate email
        const emailCheck = await query(
            `SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)`,
            [email]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(409).json({ error: 'EMAIL_TAKEN', message: 'This email is already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create user
        const userResult = await query(
            `INSERT INTO users (display_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING user_id, display_name, email`,
            [display_name, email, passwordHash]
        );
        const user = userResult.rows[0];

        // Create player_stats record
        await query(
            `INSERT INTO player_stats (user_id) VALUES ($1)`,
            [user.user_id]
        );

        // Generate tokens
        const tokenPayload = { userId: user.user_id, displayName: user.display_name };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        await storeRefreshToken(user.user_id, refreshToken);

        return res.status(201).json({
            user_id: user.user_id,
            display_name: user.display_name,
            email: user.email,
            access_token: accessToken,
            refresh_token: refreshToken,
            access_token_expires_in: ACCESS_EXPIRY,
        });
    } catch (err) {
        next(err);
    }
});

// ── POST /login ───────────────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Invalid email or password format' });
        }

        const { email, password } = parsed.data;

        // Find user
        const result = await query(
            `SELECT u.user_id, u.display_name, u.email, u.password_hash, u.is_banned, u.ban_reason, u.ban_expires_at
       FROM users u WHERE LOWER(u.email) = LOWER($1) AND u.is_guest = FALSE`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Check password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
        }

        // Check ban
        if (user.is_banned) {
            const banExpiry = user.ban_expires_at;
            if (!banExpiry || new Date(banExpiry) > new Date()) {
                return res.status(403).json({
                    error: 'ACCOUNT_BANNED',
                    message: 'Your account has been suspended',
                    details: {
                        ban_reason: user.ban_reason,
                        ban_expires_at: banExpiry,
                    },
                });
            }
            // Ban expired — auto-unban
            await query(`UPDATE users SET is_banned = FALSE WHERE user_id = $1`, [user.user_id]);
        }

        // Update last_login_at
        await query(`UPDATE users SET last_login_at = NOW() WHERE user_id = $1`, [user.user_id]);

        // Generate tokens
        const tokenPayload = { userId: user.user_id, displayName: user.display_name };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        await storeRefreshToken(user.user_id, refreshToken);

        return res.status(200).json({
            user_id: user.user_id,
            display_name: user.display_name,
            access_token: accessToken,
            refresh_token: refreshToken,
            access_token_expires_in: ACCESS_EXPIRY,
        });
    } catch (err) {
        next(err);
    }
});

// ── POST /refresh ─────────────────────────────────────────────────────────────

router.post('/refresh', async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is required' });
        }

        // Verify JWT signature and expiry
        let decoded;
        try {
            decoded = verifyRefreshToken(refresh_token);
        } catch {
            return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is expired or invalid' });
        }

        // Invalidate this refresh token (single-use)
        const tokenRecord = await invalidateRefreshToken(refresh_token);
        if (!tokenRecord) {
            return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: 'Refresh token already used or expired' });
        }

        // Issue new token pair
        const tokenPayload = { userId: decoded.userId, displayName: decoded.displayName };
        const newAccessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);
        await storeRefreshToken(decoded.userId, newRefreshToken);

        return res.status(200).json({
            access_token: newAccessToken,
            access_token_expires_in: ACCESS_EXPIRY,
            refresh_token: newRefreshToken,
        });
    } catch (err) {
        next(err);
    }
});

// ── POST /logout ──────────────────────────────────────────────────────────────

router.post('/logout', async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        if (refresh_token) {
            await invalidateRefreshToken(refresh_token);
        }
        // Also accept Authorization header for user ID
        return res.status(204).send();
    } catch (err) {
        next(err);
    }
});

// ── POST /guest ───────────────────────────────────────────────────────────────

router.post('/guest', async (req, res, next) => {
    try {
        const guestId = `guest_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
        const guestName = `Guest_${Math.floor(Math.random() * 9999)}`;

        const result = await query(
            `INSERT INTO users (display_name, email, is_guest)
       VALUES ($1, $2, TRUE)
       RETURNING user_id`,
            [guestName, `${guestId}@guest.skybattle.gg`]
        );
        const guestUser = result.rows[0];

        await query(`INSERT INTO player_stats (user_id) VALUES ($1)`, [guestUser.user_id]);

        const guestToken = generateAccessToken({ userId: guestUser.user_id, displayName: guestName, isGuest: true });

        return res.status(201).json({
            guest_id: guestId,
            display_name: guestName,
            guest_token: guestToken,
            expires_in: ACCESS_EXPIRY,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
