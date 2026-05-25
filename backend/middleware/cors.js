const cors = require('cors');
const { HttpError } = require('../errors');
const { corsAllowedOrigins } = require('../config');

const corsMiddleware = cors({
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (corsAllowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new HttpError(403, 'CORS_ORIGIN_FORBIDDEN', 'Origin is not allowed by CORS.'));
    }
});

module.exports = corsMiddleware;
