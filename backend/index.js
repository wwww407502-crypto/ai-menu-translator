require('dotenv').config();
const express = require('express');
const { HttpError } = require('./errors');
const {
    port,
    trustProxySetting,
    requestJsonLimit,
    requestTimeoutMs,
    headerTimeoutMs,
    keepAliveTimeoutMs,
    generalRateLimitWindowMs,
    generalRateLimitMaxRequests,
    parseRateLimitWindowMs,
    parseRateLimitMaxRequests,
} = require('./config');
const corsMiddleware = require('./middleware/cors');
const requestIdMiddleware = require('./middleware/request-id');
const { createRateLimitMiddleware } = require('./middleware/rate-limit');
const { resetParseConcurrency } = require('./middleware/parse-concurrency');
const errorHandler = require('./middleware/error-handler');
const { normalizeUploadedMimeType, detectImageMimeType, validateUploadedImage } = require('./middleware/upload');
const { ensureSupportedCurrency, resolveOriginalCurrency } = require('./lib/currency');
const { ensureAllowedTargetLanguage } = require('./lib/validators');
const { parsePriceText } = require('./lib/price');
const { normalizeGlobalPromotionText } = require('./lib/global-rules');
const { resolveExchangeRate } = require('./services/exchange-rate');
const { requestJsonCompletion, requestTextCompletion } = require('./services/ai');
const { normalizeParsedItem } = require('./lib/item-normalizer');
const { extractItemsFromText, extractCurrencyFromRawText } = require('./lib/degraded-extractor');
const { buildSimplifiedParseMessages, buildHighQualityParseMessages } = require('./services/menu-parser');

const app = express();

if (trustProxySetting) {
    app.set('trust proxy', trustProxySetting === 'true' ? true : trustProxySetting);
}

app.use(requestIdMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: requestJsonLimit }));

const rateLimitStores = {
    general: new Map(),
    parse: new Map()
};

const generalRateLimitMiddleware = createRateLimitMiddleware({
    store: rateLimitStores.general,
    windowMs: generalRateLimitWindowMs,
    maxRequests: generalRateLimitMaxRequests,
    scope: 'general'
});
const parseRateLimitMiddleware = createRateLimitMiddleware({
    store: rateLimitStores.parse,
    windowMs: parseRateLimitWindowMs,
    maxRequests: parseRateLimitMaxRequests,
    scope: 'parse'
});

const healthRouter = require('./routes/health');
app.use(healthRouter);

const exchangeRateRouter = require('./routes/exchange-rate');
app.use(generalRateLimitMiddleware, exchangeRateRouter);

const menuRouter = require('./routes/menu');
const menuMultiRouter = require('./routes/menu-multi');
app.use(parseRateLimitMiddleware, menuRouter);
app.use(parseRateLimitMiddleware, menuMultiRouter);

app.use(errorHandler);

let processHandlersRegistered = false;
function registerProcessHandlers() {
    if (processHandlersRegistered) {
        return;
    }

    processHandlersRegistered = true;
    process.on('unhandledRejection', (error) => {
        console.error('Unhandled promise rejection:', {
            message: error && error.message,
            stack: error && error.stack
        });
    });
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', {
            message: error && error.message,
            stack: error && error.stack
        });
    });
}

function startServer(listenPort = port) {
    registerProcessHandlers();
    const server = app.listen(listenPort, () => {
        console.log(`Backend listening on port ${listenPort}`);
    });
    server.requestTimeout = requestTimeoutMs;
    server.headersTimeout = headerTimeoutMs;
    server.keepAliveTimeout = keepAliveTimeoutMs;
    return server;
}

function resetRuntimeState() {
    resetParseConcurrency();
    Object.values(rateLimitStores).forEach((store) => store.clear());
}

if (require.main === module) {
    startServer(port);
}

module.exports = {
    app,
    startServer,
    HttpError,
    UpstreamServiceError: require('./errors').UpstreamServiceError,
    detectImageMimeType,
    ensureAllowedTargetLanguage,
    ensureSupportedCurrency,
    normalizeGlobalPromotionText,
    normalizeUploadedMimeType,
    parsePriceText,
    requestJsonCompletion,
    requestTextCompletion,
    resolveExchangeRate,
    resolveOriginalCurrency,
    resetRuntimeState,
    normalizeParsedItem,
    requireApiKeyIfConfigured: require('./middleware/api-key'),
    registerProcessHandlers,
    validateUploadedImage,
    extractItemsFromText,
    extractCurrencyFromRawText,
    buildSimplifiedParseMessages,
    buildHighQualityParseMessages,
    mergeMenuResults: require('./lib/menu-merger').mergeMenuResults
};
