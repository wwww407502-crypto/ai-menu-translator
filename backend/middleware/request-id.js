const { createRequestId } = require('../lib/utils');

function requestIdMiddleware(req, res, next) {
    req.requestId = createRequestId();
    res.setHeader('X-Request-Id', req.requestId);
    next();
}

module.exports = requestIdMiddleware;
