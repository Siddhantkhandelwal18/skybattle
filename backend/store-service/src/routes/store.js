// SKYBATTLE — Store Routes
// GET  /v1/store/items
// POST /v1/store/purchase
// GET  /v1/store/inventory
// PATCH /v1/store/inventory/equip

'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { z } = require('zod');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

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

// ── GET /items ────────────────────────────────────────────────────────────────
router.get('/items', async (req, res) => {
    try {
        const { type, rarity } = req.query;
        let sql = `SELECT item_id, item_type, item_name, description, rarity, coin_price, image_url, weapon_type
               FROM items_catalog WHERE is_battle_pass_item = FALSE`;
        const params = [];
        if (type) { params.push(type); sql += ` AND item_type = $${params.length}`; }
        if (rarity) { params.push(rarity); sql += ` AND rarity = $${params.length}`; }
        sql += ' ORDER BY coin_price ASC';

        const result = await pool.query(sql, params);
        return res.json({ items: result.rows, total: result.rows.length });
    } catch (err) {
        console.error('GET /items error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// ── POST /purchase ─────────────────────────────────────────────────────────────
const purchaseSchema = z.object({ item_id: z.number().int().positive() });

router.post('/purchase', authenticate, async (req, res) => {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(422).json({ error: 'VALIDATION_ERROR' });
    }

    const { item_id } = parsed.data;
    const userId = req.user.userId;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get item details
        const itemResult = await client.query(
            `SELECT item_id, item_type, item_name, coin_price FROM items_catalog WHERE item_id = $1`,
            [item_id]
        );
        if (itemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
        }
        const item = itemResult.rows[0];

        // Check already owned
        const ownedResult = await client.query(
            `SELECT id FROM inventory WHERE user_id = $1 AND item_id = $2`,
            [userId, item_id]
        );
        if (ownedResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'ITEM_ALREADY_OWNED' });
        }

        // Check coins
        const statsResult = await client.query(
            `SELECT coins FROM player_stats WHERE user_id = $1 FOR UPDATE`, [userId]
        );
        if (statsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'PLAYER_NOT_FOUND' });
        }
        const coins = statsResult.rows[0].coins;

        if (coins < item.coin_price) {
            await client.query('ROLLBACK');
            return res.status(402).json({ error: 'INSUFFICIENT_COINS', need: item.coin_price, have: coins });
        }

        const coinsAfter = coins - item.coin_price;

        // Deduct coins
        await client.query(
            `UPDATE player_stats SET coins = $1 WHERE user_id = $2`,
            [coinsAfter, userId]
        );

        // Add to inventory
        await client.query(
            `INSERT INTO inventory (user_id, item_type, item_id, acquisition_method)
       VALUES ($1, $2, $3, 'PURCHASED')`,
            [userId, item.item_type, item_id]
        );

        // Record transaction
        await client.query(
            `INSERT INTO transactions (user_id, transaction_type, coins_delta, coins_before, coins_after, item_id, description)
       VALUES ($1, 'PURCHASE', $2, $3, $4, $5, $6)`,
            [userId, -item.coin_price, coins, coinsAfter, item_id, `Purchased: ${item.item_name}`]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            item_id: item.item_id,
            item_name: item.item_name,
            coins_spent: item.coin_price,
            coins_remaining: coinsAfter,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /purchase error:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
        client.release();
    }
});

// ── GET /inventory ─────────────────────────────────────────────────────────────
router.get('/inventory', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT inv.id, inv.item_type, inv.is_equipped, inv.acquired_at, inv.acquisition_method,
              cat.item_name, cat.rarity, cat.image_url, cat.weapon_type
       FROM inventory inv
       JOIN items_catalog cat ON inv.item_id = cat.item_id
       WHERE inv.user_id = $1
       ORDER BY inv.acquired_at DESC`,
            [req.user.userId]
        );
        return res.json({ inventory: result.rows });
    } catch (err) {
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// ── PATCH /inventory/equip ────────────────────────────────────────────────────
const equipSchema = z.object({
    inventory_id: z.number().int().positive(),
    equip: z.boolean(),
});

router.patch('/inventory/equip', authenticate, async (req, res) => {
    const parsed = equipSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ error: 'VALIDATION_ERROR' });

    const { inventory_id, equip } = parsed.data;
    const userId = req.user.userId;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify ownership and get item_type
        const itemResult = await client.query(
            `SELECT inv.id, inv.item_type FROM inventory inv WHERE inv.id = $1 AND inv.user_id = $2`,
            [inventory_id, userId]
        );
        if (itemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'ITEM_NOT_FOUND_IN_INVENTORY' });
        }

        const { item_type } = itemResult.rows[0];

        if (equip) {
            // Unequip all other items of same type first
            await client.query(
                `UPDATE inventory SET is_equipped = FALSE WHERE user_id = $1 AND item_type = $2`,
                [userId, item_type]
            );
        }

        // Equip/unequip this item
        await client.query(
            `UPDATE inventory SET is_equipped = $1 WHERE id = $2`,
            [equip, inventory_id]
        );

        await client.query('COMMIT');
        return res.json({ success: true, equipped: equip });
    } catch (err) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
        client.release();
    }
});

// ── GET /leaderboard ──────────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '50'), 100);
        const result = await pool.query(
            `SELECT u.display_name, u.avatar_url, ps.elo_rating, ps.rank_tier,
              ps.level, ps.total_kills, ps.total_matches, ps.total_wins,
              RANK() OVER (ORDER BY ps.elo_rating DESC) as rank
       FROM player_stats ps
       JOIN users u ON ps.user_id = u.user_id
       WHERE u.is_banned = FALSE
       ORDER BY ps.elo_rating DESC
       LIMIT $1`,
            [limit]
        );
        return res.json({ leaderboard: result.rows });
    } catch (err) {
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

module.exports = router;
