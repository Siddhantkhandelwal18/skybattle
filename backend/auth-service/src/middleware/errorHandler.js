// SKYBATTLE — Global Error Handler Middleware
'use strict';

function errorHandler(err, req, res, next) {
    console.error('❌ Unhandled error:', err);

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'INVALID_TOKEN', message: err.message });
    }

    if (err.code === '23505') {
        // PostgreSQL unique constraint violation
        return res.status(409).json({ error: 'DUPLICATE_ENTRY', message: 'This record already exists' });
    }

    return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong. Please try again.',
    });
}

module.exports = { errorHandler };
