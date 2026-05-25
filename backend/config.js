const { CURRENCY_CODES, CURRENCY_METADATA } = require('./shared/currency-data');

const defaultTargetLanguages = [
    'zh-CN',
    'zh-TW',
    'en',
    'ja',
    'ko',
    'fr',
    'de',
    'es',
    'pt',
    'it',
    'ru',
    'ar',
    'th',
    'vi',
    'id',
    'ms',
    'hi',
    'tr',
    'nl',
    'pl',
    'sv',
    'bn',
    'fa',
    'fil'
];
const defaultCorsAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];

const port = Number(process.env.PORT) || 3000;
const supportedCurrencyCodes = new Set(CURRENCY_CODES);
const allowedTargetLanguages = new Set(
    (process.env.ALLOWED_TARGET_LANGUAGES || defaultTargetLanguages.join(','))
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
);
const corsAllowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS || defaultCorsAllowedOrigins.join(','))
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
);
const configuredApiKeys = new Set(
    (process.env.API_KEYS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
);
const supportedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const requestJsonLimit = process.env.REQUEST_JSON_LIMIT || '1mb';
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
const exchangeRateTimeoutMs = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS || 5000);
const parseTimeoutMs = Number(process.env.PARSE_TIMEOUT_MS || 45000);
const directParseTimeoutMs = Number(process.env.DIRECT_PARSE_TIMEOUT_MS || Math.min(parseTimeoutMs, 40000));
const minimumParseRouteTimeoutMs = directParseTimeoutMs + exchangeRateTimeoutMs + 10000;
const minimumRequestTimeoutMs = Math.max(parseTimeoutMs + 5000, minimumParseRouteTimeoutMs, 35000);
const configuredRequestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || minimumRequestTimeoutMs);
const requestTimeoutMs = Math.max(configuredRequestTimeoutMs, minimumRequestTimeoutMs);
const configuredHeaderTimeoutMs = Number(process.env.HEADER_TIMEOUT_MS || requestTimeoutMs + 1000);
const headerTimeoutMs = Math.max(configuredHeaderTimeoutMs, requestTimeoutMs + 1000);
const keepAliveTimeoutMs = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 5000);
const maxConcurrentParses = Number(process.env.MAX_CONCURRENT_PARSES || 4);
const generalRateLimitWindowMs = Number(process.env.GENERAL_RATE_LIMIT_WINDOW_MS || 60000);
const generalRateLimitMaxRequests = Number(process.env.GENERAL_RATE_LIMIT_MAX_REQUESTS || 120);
const parseRateLimitWindowMs = Number(process.env.PARSE_RATE_LIMIT_WINDOW_MS || 60000);
const parseRateLimitMaxRequests = Number(process.env.PARSE_RATE_LIMIT_MAX_REQUESTS || 10);
const trustProxySetting = typeof process.env.TRUST_PROXY === 'string'
    ? process.env.TRUST_PROXY.trim()
    : '';

const dashscopeApiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY;
const dashscopeBaseURL = process.env.DASHSCOPE_BASE_URL
    || process.env.OPENAI_BASE_URL
    || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const modelMaxRetries = Number(process.env.MODEL_MAX_RETRIES || 0);
const modelConnectionRetryCount = Math.max(0, Number(process.env.MODEL_CONNECTION_RETRY_COUNT || 1));
const modelMaxTokens = Number(process.env.MODEL_MAX_TOKENS || 4096);
const visionModel = process.env.VISION_MODEL || 'qwen3-vl-flash';
const parseEnableThinking = process.env.PARSE_ENABLE_THINKING === 'true';
const parseThinkingBudget = Number(process.env.PARSE_THINKING_BUDGET || 0);

const fallbackRates = {
    'USD': { 'CNY': 7.2 },
    'JPY': { 'CNY': 0.048 },
    'EUR': { 'CNY': 7.8 },
    'KRW': { 'CNY': 0.0053 }
};

const supportedParseModes = new Set(['basic', 'structured', 'partial']);
const supportedItemTypes = new Set(['single', 'tiered', 'bundle']);
const supportedDiscountRuleTypes = new Set([
    'bundle_price',
    'buy_x_get_y',
    'nth_item_discount',
    'percentage_discount',
    'amount_off',
    'raw'
]);

const comboKeywordPattern = /(セット|ミックス|盛り合わせ|盛合せ|combo|mix|basket|バスケット|套餐|套組|组合|組合|拼盘|拼盤|双人餐|雙人餐|多人餐|set\s*meal|value\s*meal|family\s*meal)/i;
const addOnKeywordPattern = /(追加|add-?on|\+\s*\d|トッピング|ソース|extra)/i;
const bonusKeywordPattern = /(無料|サービス|付き|おまけ|bonus|free)/i;
const discountKeywordPattern = /(优惠|優惠|折扣|折|半价|半價|买|買|送|赠|贈|满|滿|减|減|任选|任選|多买|多買|第\s*[一二三四五六七八九十\d]+|buy|free|off|discount|deal|special|half\s*price|\b(?:2nd|3rd|4th|5th|second)\b|for\s*[$€£¥￥₩]?\s*\d)/i;
const westernDecimalCurrencies = new Set(['USD', 'EUR', 'GBP', 'AUD', 'NZD']);
const currencyCodePattern = `(?:${CURRENCY_CODES.join('|')})`;
const currencySymbolPattern = '[$€£¥￥₩]';
const priceNumberBodyPattern = '\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?';
const priceNumberPattern = `(${priceNumberBodyPattern})`;
const genericPriceTextPattern = new RegExp(
    `(?:\\b(?:${CURRENCY_CODES.join('|')})\\b\\s*)?[$€£¥￥₩]?\\s*\\d[\\d.,]*(?:\\s*(?:円|ドル|${CURRENCY_CODES.join('|')}))?`,
    'gi'
);
const quantityUnitPattern = /(ヶ|個|本|串|枚|皿|人前|セット|pcs?|pieces?|杯|斤|g|kg)/i;

module.exports = {
    port,
    supportedCurrencyCodes,
    allowedTargetLanguages,
    corsAllowedOrigins,
    configuredApiKeys,
    supportedImageMimeTypes,
    requestJsonLimit,
    maxUploadBytes,
    exchangeRateTimeoutMs,
    parseTimeoutMs,
    directParseTimeoutMs,
    requestTimeoutMs,
    headerTimeoutMs,
    keepAliveTimeoutMs,
    maxConcurrentParses,
    generalRateLimitWindowMs,
    generalRateLimitMaxRequests,
    parseRateLimitWindowMs,
    parseRateLimitMaxRequests,
    trustProxySetting,
    dashscopeApiKey,
    dashscopeBaseURL,
    modelMaxRetries,
    modelConnectionRetryCount,
    modelMaxTokens,
    visionModel,
    parseEnableThinking,
    parseThinkingBudget,
    fallbackRates,
    supportedParseModes,
    supportedItemTypes,
    supportedDiscountRuleTypes,
    comboKeywordPattern,
    addOnKeywordPattern,
    bonusKeywordPattern,
    discountKeywordPattern,
    westernDecimalCurrencies,
    currencyCodePattern,
    currencySymbolPattern,
    priceNumberBodyPattern,
    priceNumberPattern,
    genericPriceTextPattern,
    quantityUnitPattern
};
