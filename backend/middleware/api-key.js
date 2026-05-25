const { toTrimmedString } = require('../lib/utils');
const { HttpError } = require('../errors');
const { configuredApiKeys } = require('../config');

function requireApiKeyIfConfigured(req, res, next) {
    if (!configuredApiKeys.size) {
        next();
        return;
    }

    const apiKey = toTrimmedString(req.get('x-api-key'));
    if (!apiKey || !configuredApiKeys.has(apiKey)) {
        next(new HttpError(401, 'UNAUTHORIZED', 'Missing or invalid API key.'));
        return;
    }

    next();
}

module.exports = requireApiKeyIfConfigured;
