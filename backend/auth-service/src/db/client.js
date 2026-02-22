// SKYBATTLE — PostgreSQL Database Client
'use strict';

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('⚠️  Unexpected PostgreSQL client error:', err);
});

module.exports = { pool, query: (...args) => pool.query(...args) };
