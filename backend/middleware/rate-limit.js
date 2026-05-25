const { toTrimmedString } = require('../lib/utils');

function getClientIdentifier(req) {
    return toTrimmedString(req.ip)
        || toTrimmedString(req.headers['x-forwarded-for'])
        || toTrimmedString(req.socket && req.socket.remoteAddress)
        || 'unknown';
}

function pruneExpiredRateLimitEntries(store, now) {
    if (store.size < 1024) {
        return;
    }

    for (const [key, entry] of store.entries()) {
        if (!entry || entry.resetAt <= now) {
            store.delete(key);
        }
    }
}

function createRateLimitMiddleware({ store, windowMs, maxRequests, scope }) {
    return (req, res, next) => {
        const now = Date.now();
        pruneExpiredRateLimitEntries(store, now);
        const clientId = getClientIdentifier(req);
        const key = `${scope}:${clientId}`;
        const existingEntry = store.get(key);
        const entry = existingEntry && existingEntry.resetAt > now
            ? existingEntry
            : { count: 0, resetAt: now + windowMs };

        entry.count += 1;
        store.set(key, entry);

        res.setHeader('X-RateLimit-Limit', String(maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

        if (entry.count > maxRequests) {
            const { HttpError } = require('../errors');
            next(new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.'));
            return;
        }

        next();
    };
}

module.exports = { createRateLimitMiddleware };
