require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { OpenAI } = require('openai');
const axios = require('axios');
const { CURRENCY_CODES, CURRENCY_METADATA } = require('../miniprogram/utils/currency-data');

const app = express();
const port = Number(process.env.PORT) || 3000;
const supportedCurrencyCodes = new Set(CURRENCY_CODES);
const defaultTargetLanguages = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'];
const allowedTargetLanguages = new Set(
    (process.env.ALLOWED_TARGET_LANGUAGES || defaultTargetLanguages.join(','))
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
);
const supportedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const requestJsonLimit = process.env.REQUEST_JSON_LIMIT || '1mb';
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
const exchangeRateTimeoutMs = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS || 5000);
const ocrTimeoutMs = Number(process.env.OCR_TIMEOUT_MS || 20000);
const parseTimeoutMs = Number(process.env.PARSE_TIMEOUT_MS || 30000);

app.use(cors());
app.use(express.json({ limit: requestJsonLimit }));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    timeout: parseTimeoutMs,
});

const visionModel = process.env.VISION_MODEL || 'gpt-4o';
const ocrModel = process.env.OCR_MODEL || 'qwen-vl-ocr-2025-11-20';
const parseEnableThinking = process.env.PARSE_ENABLE_THINKING !== 'false';
const parseThinkingBudget = Number(process.env.PARSE_THINKING_BUDGET || 0);

const fallbackRates = {
    'USD': { 'CNY': 7.2 },
    'JPY': { 'CNY': 0.048 },
    'EUR': { 'CNY': 7.8 },
    'KRW': { 'CNY': 0.0053 }
};

const supportedParseModes = new Set(['basic', 'structured', 'partial']);
const supportedItemTypes = new Set(['single', 'tiered', 'bundle']);
const comboKeywordPattern = /(セット|ミックス|盛り合わせ|盛合せ|combo|mix|basket|バスケット)/i;
const addOnKeywordPattern = /(追加|add-?on|\+\s*\d|トッピング|ソース|extra)/i;
const bonusKeywordPattern = /(無料|サービス|付き|おまけ|bonus|free)/i;
const westernDecimalCurrencies = new Set(['USD', 'EUR', 'GBP', 'AUD', 'NZD']);
const currencyCodePattern = `(?:${CURRENCY_CODES.join('|')})`;
const currencySymbolPattern = '[$€£¥]';
const priceNumberPattern = '(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)';
const genericPriceTextPattern = new RegExp(
    `(?:\\b(?:${CURRENCY_CODES.join('|')})\\b\\s*)?[$€£¥￥₩]?\\s*\\d[\\d.,]*(?:\\s*(?:円|ドル|${CURRENCY_CODES.join('|')}))?`,
    'gi'
);
const quantityUnitPattern = /(ヶ|個|本|串|枚|皿|人前|セット|pcs?|pieces?|杯|斤|g|kg)/i;

class HttpError extends Error {
    constructor(statusCode, errorCode, message, details = undefined) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
    }
}

class UpstreamServiceError extends HttpError {
    constructor(message, errorCode = 'UPSTREAM_FAILURE', details = undefined, statusCode = 502) {
        super(statusCode, errorCode, message, details);
        this.name = 'UpstreamServiceError';
    }
}

function isSupportedCurrency(value) {
    return supportedCurrencyCodes.has(normalizeCurrencyCode(value));
}

function ensureSupportedCurrency(value, fieldName) {
    const currency = normalizeCurrencyCode(value);
    if (!currency || !isSupportedCurrency(currency)) {
        throw new HttpError(400, 'INVALID_CURRENCY', `Unsupported ${fieldName}.`);
    }
    return currency;
}

function ensureAllowedTargetLanguage(value) {
    const normalized = toTrimmedString(value) || 'zh-CN';
    if (!allowedTargetLanguages.has(normalized)) {
        throw new HttpError(400, 'INVALID_TARGET_LANGUAGE', 'Unsupported targetLang.');
    }
    return normalized;
}

function normalizeUploadedMimeType(value) {
    const normalized = toTrimmedString(value).toLowerCase();
    if (normalized === 'image/jpg') {
        return 'image/jpeg';
    }
    return normalized;
}

function detectImageMimeType(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        return null;
    }

    if (
        buffer.length >= 8
        && buffer[0] === 0x89
        && buffer[1] === 0x50
        && buffer[2] === 0x4e
        && buffer[3] === 0x47
        && buffer[4] === 0x0d
        && buffer[5] === 0x0a
        && buffer[6] === 0x1a
        && buffer[7] === 0x0a
    ) {
        return 'image/png';
    }

    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }

    if (
        buffer.length >= 12
        && buffer.toString('ascii', 0, 4) === 'RIFF'
        && buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return 'image/webp';
    }

    return null;
}

function validateUploadedImage(file) {
    if (!file) {
        throw new HttpError(400, 'IMAGE_REQUIRED', 'No image uploaded.');
    }

    const declaredMimeType = normalizeUploadedMimeType(file.mimetype);
    if (!supportedImageMimeTypes.has(declaredMimeType)) {
        throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, and WEBP images are supported.');
    }

    const detectedMimeType = detectImageMimeType(file.buffer);
    if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
        throw new HttpError(415, 'INVALID_IMAGE_CONTENT', 'Uploaded file is not a valid supported image.');
    }
}

function resolveOriginalCurrency(...candidates) {
    for (const candidate of candidates) {
        const currency = normalizeCurrencyCode(candidate);
        if (currency && isSupportedCurrency(currency)) {
            return currency;
        }
    }
    return null;
}

function createUploadMiddleware() {
    const storage = multer.memoryStorage();
    return multer({
        storage,
        limits: {
            fileSize: maxUploadBytes,
            files: 1
        },
        fileFilter: (req, file, callback) => {
            const mimeType = normalizeUploadedMimeType(file.mimetype);
            if (!supportedImageMimeTypes.has(mimeType)) {
                callback(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, and WEBP images are supported.'));
                return;
            }
            callback(null, true);
        }
    });
}

const upload = createUploadMiddleware();

function toTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function toOptionalString(value) {
    const normalized = toTrimmedString(value);
    return normalized || null;
}

function toOptionalNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function toOptionalPriceNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const normalized = toTrimmedString(value).replace(/,/g, '');
    if (!normalized) {
        return null;
    }

    const directNumeric = Number(normalized);
    if (Number.isFinite(directNumeric)) {
        return directNumeric;
    }

    const match = normalized.match(/-?\d+(?:\.\d{1,2})?/);
    if (!match) {
        return null;
    }

    const numeric = Number(match[0]);
    return Number.isFinite(numeric) ? numeric : null;
}

function roundPrice(value, digits = 2) {
    return Number((Number(value) || 0).toFixed(digits));
}

function convertPrice(value, exchangeRate) {
    return roundPrice((Number(value) || 0) * exchangeRate, 2);
}

async function resolveExchangeRate(fromCurrency, toCurrency) {
    const sourceCurrency = normalizeCurrencyCode(fromCurrency);
    const targetCurrency = normalizeCurrencyCode(toCurrency);

    if (!sourceCurrency || !targetCurrency) {
        throw new HttpError(400, 'INVALID_CURRENCY', 'Currency code is required.');
    }

    if (!isSupportedCurrency(sourceCurrency) || !isSupportedCurrency(targetCurrency)) {
        throw new HttpError(400, 'INVALID_CURRENCY', 'Unsupported currency code.');
    }

    if (sourceCurrency === targetCurrency) {
        return 1;
    }

    try {
        const response = await axios.get(`https://open.er-api.com/v6/latest/${sourceCurrency}`, {
            timeout: exchangeRateTimeoutMs
        });
        if (response.data && response.data.rates && response.data.rates[targetCurrency]) {
            return response.data.rates[targetCurrency];
        }
        throw new Error('Rate not found');
    } catch (error) {
        if (fallbackRates[sourceCurrency] && fallbackRates[sourceCurrency][targetCurrency]) {
            return fallbackRates[sourceCurrency][targetCurrency];
        }

        if (error && (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || ''))) {
            throw new UpstreamServiceError('Exchange rate request timed out.', 'EXCHANGE_RATE_TIMEOUT', undefined, 504);
        }

        throw new UpstreamServiceError('Failed to resolve exchange rate.', 'EXCHANGE_RATE_UNAVAILABLE');
    }
}

function normalizeCurrencyCode(value) {
    return toTrimmedString(value).toUpperCase();
}

function getCurrencyMeta(currency) {
    const normalizedCurrency = normalizeCurrencyCode(currency);
    return {
        fractionDigits: (CURRENCY_METADATA[normalizedCurrency] || {}).fractionDigits ?? 2,
        decimalSeparator: '.',
        symbols: []
    };
}

function getCurrencyFractionDigits(currency) {
    return getCurrencyMeta(currency).fractionDigits;
}

function isWesternDecimalCurrency(currency) {
    return westernDecimalCurrencies.has(normalizeCurrencyCode(currency));
}

function isLikelyRawPriceText(rawPriceText, currency) {
    const rawText = toTrimmedString(rawPriceText);
    if (!rawText) return false;

    const hasCurrencyCode = new RegExp(`\\b${currencyCodePattern}\\b`, 'i').test(rawText);
    const hasCurrencySymbol = /[$€£¥￥₩]/.test(rawText);
    const hasCurrencyUnit = new RegExp(`(円|ドル|${currencyCodePattern})`, 'i').test(rawText);
    const hasDecimal = /[.,]\d{1,2}\b/.test(rawText);
    const hasQuantityUnit = quantityUnitPattern.test(rawText);
    const plainDigits = rawText.replace(/[^\d]/g, '');
    const fractionDigits = getCurrencyFractionDigits(currency);

    if (hasCurrencyCode || hasCurrencySymbol || hasCurrencyUnit || hasDecimal) {
        return true;
    }

    if (hasQuantityUnit) {
        return false;
    }

    return fractionDigits === 0 && /^\d{3,5}$/.test(plainDigits);
}

function parsePriceText(rawPriceText, currency) {
    const rawText = toTrimmedString(rawPriceText);
    if (!rawText) return null;
    if (!isLikelyRawPriceText(rawText, currency)) return null;

    const meta = getCurrencyMeta(currency);
    let normalized = rawText
        .replace(new RegExp(`\\b(?:${CURRENCY_CODES.join('|')})\\b`, 'gi'), '')
        .replace(/[€£$¥￥₩円ドル元]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^\d,.-]/g, '');

    if (!normalized) {
        return null;
    }

    if (meta.fractionDigits === 0) {
        const integerValue = Number(normalized.replace(/[.,]/g, ''));
        return Number.isFinite(integerValue) ? integerValue : null;
    }

    const lastDot = normalized.lastIndexOf('.');
    const lastComma = normalized.lastIndexOf(',');
    let decimalSeparator = '';

    if (lastDot >= 0 && lastComma >= 0) {
        decimalSeparator = lastDot > lastComma ? '.' : ',';
    } else if (lastDot >= 0 || lastComma >= 0) {
        const separator = lastDot >= 0 ? '.' : ',';
        const lastIndex = separator === '.' ? lastDot : lastComma;
        const digitsAfter = normalized.slice(lastIndex + 1).replace(/[^\d]/g, '').length;
        if (digitsAfter > 0 && digitsAfter <= meta.fractionDigits) {
            decimalSeparator = separator;
        } else if (digitsAfter === meta.fractionDigits) {
            decimalSeparator = separator;
        }
    }

    if (decimalSeparator) {
        const thousandsSeparator = decimalSeparator === '.' ? ',' : '.';
        normalized = normalized.replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '');
        const lastIndex = normalized.lastIndexOf(decimalSeparator);
        normalized = `${normalized.slice(0, lastIndex).replace(new RegExp(`\\${decimalSeparator}`, 'g'), '')}.${normalized.slice(lastIndex + 1)}`;
    } else {
        normalized = normalized.replace(/[.,]/g, '');
    }

    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) {
        return null;
    }

    return roundPrice(numeric, meta.fractionDigits);
}

function resolvePriceValue(rawPriceText, numericValue, currency, candidateText = '') {
    const parsedFromRaw = parsePriceText(rawPriceText, currency);
    if (parsedFromRaw !== null) {
        return parsedFromRaw;
    }

    const numericPrice = toOptionalPriceNumber(numericValue);
    if (numericPrice === null) {
        return null;
    }

    return maybeRestoreDecimalPrice(numericPrice, candidateText, currency);
}

function extractDecimalPriceCandidates(text) {
    if (!text) return [];

    const decimalPattern = new RegExp(
        `(?:${currencyCodePattern}\\s*${currencySymbolPattern}?\\s*${priceNumberPattern}|${currencySymbolPattern}\\s*${priceNumberPattern}|${priceNumberPattern}\\s*(?:${currencyCodePattern})|\\b${priceNumberPattern}\\b)`,
        'gi'
    );
    const matches = Array.from(text.matchAll(decimalPattern));
    return Array.from(new Set(
        matches
            .map((match) => match[0])
            .filter((segment) => /\d+\.\d{1,2}/.test(segment))
            .map((segment) => toOptionalPriceNumber(segment))
            .filter((value) => value !== null)
            .map((value) => roundPrice(value, 2))
    ));
}

function isSuspiciousWesternIntegerPrice(price, currency) {
    return isWesternDecimalCurrency(currency)
        && Number.isFinite(price)
        && Number.isInteger(price)
        && price >= 100
        && price <= 10000;
}

function maybeRestoreDecimalPrice(price, candidateText, currency) {
    if (!isSuspiciousWesternIntegerPrice(price, currency)) {
        return price;
    }

    const decimalCandidates = extractDecimalPriceCandidates(candidateText);
    const matchedCandidate = decimalCandidates.find((candidate) => {
        const scaled100 = Math.round(candidate * 100);
        const scaled10 = Math.round(candidate * 10);
        return scaled100 === Math.round(price) || scaled10 === Math.round(price);
    });

    if (matchedCandidate !== undefined) {
        return roundPrice(matchedCandidate, 2);
    }

    const dividedBy100 = price / 100;
    if (dividedBy100 >= 0.5 && dividedBy100 <= 99.99) {
        return roundPrice(dividedBy100, 2);
    }

    return price;
}

function shouldPreferInferredPrices(explicitItems, inferredItems, currency) {
    if (!isWesternDecimalCurrency(currency) || !explicitItems.length || !inferredItems.length) {
        return false;
    }

    const explicitAllSuspicious = explicitItems.every((item) => isSuspiciousWesternIntegerPrice(item.originalPrice, currency));
    const inferredHasReasonableDecimal = inferredItems.some((item) => item.originalPrice < 100 || !Number.isInteger(item.originalPrice));

    return explicitAllSuspicious && inferredHasReasonableDecimal;
}

function normalizeTier(tier, index, exchangeRate, originalCurrency, candidateText = '') {
    const rawPriceText = toOptionalString(tier && (tier.originalPriceText || tier.priceText || tier.rawPriceText));
    const originalPrice = resolvePriceValue(
        rawPriceText,
        tier && tier.originalPrice,
        originalCurrency,
        [
            tier && tier.originalLabel,
            tier && tier.label,
            tier && tier.note,
            candidateText
        ].map((value) => toTrimmedString(value)).filter(Boolean).join(' | ')
    );
    if (originalPrice === null) {
        return null;
    }

    const convertedPrice = toOptionalPriceNumber(tier && tier.convertedPrice);

    return {
        id: toTrimmedString(tier && tier.id) || `tier-${index + 1}`,
        label: toOptionalString(tier && tier.label),
        originalLabel: toOptionalString(tier && tier.originalLabel) || toOptionalString(tier && tier.label),
        translatedLabel: toOptionalString(tier && tier.translatedLabel) || toOptionalString(tier && tier.label),
        quantity: toOptionalNumber(tier && tier.quantity),
        originalPriceText: rawPriceText,
        originalPrice: roundPrice(originalPrice, 2),
        convertedPrice: convertedPrice === null ? convertPrice(originalPrice, exchangeRate) : roundPrice(convertedPrice, 2),
        note: toOptionalString(tier && tier.note)
    };
}

function normalizeBundleItem(bundleItem) {
    const originalName = toTrimmedString(bundleItem && bundleItem.originalName);
    const translatedName = toTrimmedString(bundleItem && bundleItem.translatedName);

    if (!originalName && !translatedName) {
        return null;
    }

    return {
        originalName,
        translatedName: translatedName || originalName,
        quantity: toOptionalNumber(bundleItem && bundleItem.quantity),
        note: toOptionalString(bundleItem && bundleItem.note)
    };
}

function normalizeAddOn(addOn, index, exchangeRate, originalCurrency, candidateText = '') {
    const rawPriceText = toOptionalString(addOn && (addOn.originalPriceDeltaText || addOn.originalPriceText || addOn.priceText || addOn.rawPriceText));
    const originalPriceDelta = resolvePriceValue(
        rawPriceText,
        addOn && (addOn.originalPriceDelta ?? addOn.originalPrice),
        originalCurrency,
        [
            addOn && addOn.originalLabel,
            addOn && addOn.label,
            addOn && addOn.note,
            candidateText
        ].map((value) => toTrimmedString(value)).filter(Boolean).join(' | ')
    );
    const convertedPriceDelta = toOptionalPriceNumber(addOn && (addOn.convertedPriceDelta ?? addOn.convertedPrice));
    const originalLabel = toOptionalString(addOn && addOn.originalLabel) || toOptionalString(addOn && addOn.label);
    const translatedLabel = toOptionalString(addOn && addOn.translatedLabel) || toOptionalString(addOn && addOn.label);

    if (!originalLabel && !translatedLabel && originalPriceDelta === null) {
        return null;
    }

    return {
        id: toTrimmedString(addOn && addOn.id) || `addon-${index + 1}`,
        originalLabel,
        translatedLabel,
        originalPriceDeltaText: rawPriceText,
        originalPriceDelta: originalPriceDelta === null ? 0 : roundPrice(originalPriceDelta, 2),
        convertedPriceDelta: convertedPriceDelta === null
            ? convertPrice(originalPriceDelta || 0, exchangeRate)
            : roundPrice(convertedPriceDelta, 2),
        required: Boolean(addOn && addOn.required),
        note: toOptionalString(addOn && addOn.note)
    };
}

function normalizeBonusItem(bonusItem) {
    const originalLabel = toOptionalString(bonusItem && bonusItem.originalLabel)
        || toOptionalString(bonusItem && bonusItem.originalName)
        || toOptionalString(bonusItem && bonusItem.label);
    const translatedLabel = toOptionalString(bonusItem && bonusItem.translatedLabel)
        || toOptionalString(bonusItem && bonusItem.translatedName)
        || toOptionalString(bonusItem && bonusItem.label);

    if (!originalLabel && !translatedLabel) {
        return null;
    }

    return {
        originalLabel,
        translatedLabel,
        quantity: toOptionalNumber(bonusItem && bonusItem.quantity),
        note: toOptionalString(bonusItem && bonusItem.note)
    };
}

function getCandidateTextParts(item) {
    return [
        item && item.originalName,
        item && item.translatedName,
        item && item.promotionSummary,
        item && item.rawPromotionText,
        item && item.promotionText,
        item && item.promotionNote,
        item && item.description,
        item && item.originalDescription,
        item && item.translatedDescription,
        item && item.note
    ]
        .map((value) => toTrimmedString(value))
        .filter(Boolean);
}

function createTierIdFromLabel(label, index) {
    return `tier-${toTrimmedString(label).replace(/\s+/g, '-').toLowerCase() || index + 1}`;
}

function extractTiersFromText(text, exchangeRate) {
    if (!text) return [];

    const matches = Array.from(
        text.matchAll(new RegExp(
            `(\\d+)\\s*(ヶ|個|本|枚|皿|人前|セット|pcs?|pieces?)\\s*(?:[:：/\\-x× ]+)?\\s*(?:得\\s*)?(?:${currencyCodePattern}\\s*|${currencySymbolPattern}\\s*)?${priceNumberPattern}\\s*(?:円|ドル|usd|eur|gbp|aud|nzd|cad)?`,
            'gi'
        ))
    );

    return matches.map((match, index) => {
        const quantity = toOptionalNumber(match[1]);
        const unit = toTrimmedString(match[2]);
        const originalPrice = toOptionalPriceNumber(match[3]);

        if (quantity === null || originalPrice === null) {
            return null;
        }

        const originalLabel = `${quantity}${unit}`;
        return {
            id: createTierIdFromLabel(originalLabel, index),
            label: originalLabel,
            originalLabel,
            translatedLabel: originalLabel,
            quantity,
            originalPrice: roundPrice(originalPrice, 2),
            convertedPrice: convertPrice(originalPrice, exchangeRate),
            note: null
        };
    }).filter(Boolean);
}

function extractAddOnsFromText(text, exchangeRate) {
    if (!text) return [];

    const matches = Array.from(
        text.matchAll(new RegExp(
            `(?:追加|add-?on|\\+)\\s*([^:：,，]+?)\\s*(?:${currencyCodePattern}\\s*|${currencySymbolPattern}\\s*)?${priceNumberPattern}\\s*(?:円|ドル|usd|eur|gbp|aud|nzd|cad)?`,
            'gi'
        ))
    );

    return matches.map((match, index) => {
        const label = toTrimmedString(match[1]);
        const originalPriceDelta = toOptionalPriceNumber(match[2]);

        if (!label || originalPriceDelta === null) {
            return null;
        }

        return {
            id: `addon-inferred-${index + 1}`,
            originalLabel: label,
            translatedLabel: label,
            originalPriceDelta: roundPrice(originalPriceDelta, 2),
            convertedPriceDelta: convertPrice(originalPriceDelta, exchangeRate),
            required: false,
            note: null
        };
    }).filter(Boolean);
}

function ensureUniqueById(items = []) {
    const seen = new Set();
    return items.filter((item) => {
        const id = toTrimmedString(item && item.id) || JSON.stringify(item);
        if (seen.has(id)) {
            return false;
        }
        seen.add(id);
        return true;
    });
}

function inferRuleSignals(item, exchangeRate) {
    const candidateText = getCandidateTextParts(item).join(' | ');
    const inferredTiers = extractTiersFromText(candidateText, exchangeRate);
    const inferredAddOns = extractAddOnsFromText(candidateText, exchangeRate);
    const comboCandidate = comboKeywordPattern.test(candidateText);
    const addOnCandidate = addOnKeywordPattern.test(candidateText);
    const bonusCandidate = bonusKeywordPattern.test(candidateText);

    return {
        candidateText,
        inferredTiers,
        inferredAddOns,
        comboCandidate,
        addOnCandidate,
        bonusCandidate
    };
}

function inferGlobalAddOns(payload, exchangeRate, originalCurrency) {
    const explicitGlobalAddOns = Array.isArray(payload && payload.globalAddOns)
        ? payload.globalAddOns.map((addOn, index) => normalizeAddOn(addOn, index, exchangeRate, originalCurrency)).filter(Boolean)
        : [];
    if (explicitGlobalAddOns.length) {
        return explicitGlobalAddOns;
    }

    const fallbackText = [
        payload && payload.globalPromotionText,
        payload && payload.globalAddOnText,
        payload && payload.footerNotes,
        payload && payload.footerText,
        payload && payload.bottomNotes
    ]
        .map((value) => toTrimmedString(value))
        .filter(Boolean)
        .join(' | ');

    return extractAddOnsFromText(fallbackText, exchangeRate);
}

function countPriceTextMatches(text = '') {
    return (toTrimmedString(text).match(genericPriceTextPattern) || []).length;
}

function isLikelyCatalogPromotionText(text = '') {
    const normalized = toTrimmedString(text);
    if (!normalized) return false;

    const lineCount = normalized
        .split(/\n|\/|\|/)
        .map((line) => toTrimmedString(line))
        .filter(Boolean)
        .length;
    const priceCount = countPriceTextMatches(normalized);
    const hasGlobalRuleKeyword = addOnKeywordPattern.test(normalized) || /(dessert add-?on|shared add-?on|upgrade|任选|可加|附加)/i.test(normalized);

    if (hasGlobalRuleKeyword && priceCount <= 2 && lineCount <= 3) {
        return false;
    }

    return priceCount >= 3 || lineCount >= 4 || normalized.length > 160;
}

function normalizeGlobalPromotionText(text) {
    const normalized = toOptionalString(text);
    if (!normalized) {
        return null;
    }

    return isLikelyCatalogPromotionText(normalized) ? null : normalized;
}

function inferItemType(item, tiers, bundleItems) {
    const itemType = toTrimmedString(item && item.itemType).toLowerCase();
    if (supportedItemTypes.has(itemType)) {
        return itemType;
    }
    if (bundleItems.length) {
        return 'bundle';
    }
    if (tiers.length) {
        return 'tiered';
    }
    return 'single';
}

function inferParseMode(item, hasStructuredPromotion) {
    const parseMode = toTrimmedString(item && item.parseMode).toLowerCase();
    if (supportedParseModes.has(parseMode)) {
        return parseMode;
    }

    const rawPromotionText = toOptionalString(item && (item.rawPromotionText || item.promotionText || item.promotionNote));
    if (hasStructuredPromotion) {
        return 'structured';
    }
    if (rawPromotionText) {
        return 'partial';
    }
    return 'basic';
}

function normalizeParsedItem(item, index, exchangeRate, originalCurrency) {
    const candidateTextParts = getCandidateTextParts(item);
    const candidateText = candidateTextParts.join(' | ');
    const tiers = Array.isArray(item && item.tiers)
        ? item.tiers.map((tier, tierIndex) => normalizeTier(tier, tierIndex, exchangeRate, originalCurrency, candidateText)).filter(Boolean)
        : [];
    const bundleItems = Array.isArray(item && item.bundleItems)
        ? item.bundleItems.map((bundleItem) => normalizeBundleItem(bundleItem)).filter(Boolean)
        : [];
    const addOns = Array.isArray(item && item.addOns)
        ? item.addOns.map((addOn, addOnIndex) => normalizeAddOn(addOn, addOnIndex, exchangeRate, originalCurrency, candidateText)).filter(Boolean)
        : [];
    const bonusItems = Array.isArray(item && item.bonusItems)
        ? item.bonusItems.map((bonusItem) => normalizeBonusItem(bonusItem)).filter(Boolean)
        : [];

    const ruleSignals = inferRuleSignals(item, exchangeRate);
    const mergedTiers = shouldPreferInferredPrices(tiers, ruleSignals.inferredTiers, originalCurrency)
        ? ruleSignals.inferredTiers
        : (tiers.length ? tiers : ruleSignals.inferredTiers);
    const mergedAddOns = shouldPreferInferredPrices(addOns, ruleSignals.inferredAddOns, originalCurrency)
        ? ruleSignals.inferredAddOns
        : (addOns.length ? addOns : ruleSignals.inferredAddOns);
    const itemType = inferItemType(
        {
            ...item,
            itemType: ruleSignals.comboCandidate && !toTrimmedString(item && item.itemType) ? 'bundle' : item && item.itemType
        },
        mergedTiers,
        bundleItems
    );
    const directOriginalPrice = resolvePriceValue(
        item && (item.originalPriceText || item.priceText || item.rawPriceText),
        item && (item.originalPrice ?? item.price),
        originalCurrency,
        candidateText
    );
    const derivedOriginalPrice = directOriginalPrice === null
        ? (mergedTiers[0] ? mergedTiers[0].originalPrice : 0)
        : directOriginalPrice;
    const directConvertedPrice = toOptionalPriceNumber(item && item.convertedPrice);
    const derivedConvertedPrice = directConvertedPrice === null
        ? convertPrice(derivedOriginalPrice, exchangeRate)
        : directConvertedPrice;
    const rawPromotionText = toOptionalString(item && (item.rawPromotionText || item.promotionText || item.promotionNote));
    const inferredRawPromotionText = rawPromotionText || (
        (ruleSignals.inferredTiers.length > 1 || ruleSignals.inferredAddOns.length || ruleSignals.comboCandidate || ruleSignals.bonusCandidate)
            ? ruleSignals.candidateText
            : null
    );
    const hasStructuredPromotion = itemType !== 'single' || mergedAddOns.length > 0 || bonusItems.length > 0;
    let parseMode = inferParseMode(item, hasStructuredPromotion || mergedTiers.length > 0 || bundleItems.length > 0);

    if (
        parseMode === 'basic' &&
        (
            ruleSignals.inferredTiers.length > 1 ||
            (ruleSignals.comboCandidate && !bundleItems.length) ||
            (ruleSignals.addOnCandidate && !mergedAddOns.length) ||
            ruleSignals.bonusCandidate
        )
    ) {
        parseMode = 'partial';
    }

    const normalizedPromotionSummary = toOptionalString(item && item.promotionSummary)
        || (itemType === 'tiered' && mergedTiers.length > 1 ? 'Contains multi-tier pricing' : null)
        || (itemType === 'bundle' && ruleSignals.comboCandidate ? 'Contains combo or mixed set pricing' : null);

    return {
        category: toTrimmedString(item && item.category) || 'Other',
        originalName: toTrimmedString(item && item.originalName) || `Item ${index + 1}`,
        translatedName: toTrimmedString(item && item.translatedName) || toTrimmedString(item && item.originalName) || `Item ${index + 1}`,
        itemType,
        pricingType: itemType,
        originalPriceText: toOptionalString(item && (item.originalPriceText || item.priceText || item.rawPriceText)),
        originalPrice: roundPrice(derivedOriginalPrice, 2),
        convertedPrice: roundPrice(derivedConvertedPrice, 2),
        displayOriginalPrice: roundPrice(derivedOriginalPrice, 2),
        displayConvertedPrice: roundPrice(derivedConvertedPrice, 2),
        tiers: ensureUniqueById(mergedTiers),
        bundleItems,
        addOns: ensureUniqueById(mergedAddOns),
        bonusItems,
        promotionSummary: normalizedPromotionSummary,
        rawPromotionText: inferredRawPromotionText,
        parseMode,
        hasStructuredPromotion
    };
}

function inferSourceLanguage(items = []) {
    const sourceText = items
        .map((item) => item.originalName || '')
        .join(' ');

    if (/[ぁ-ゟ゠-ヿ]/.test(sourceText)) return 'ja';
    if (/[가-힣]/.test(sourceText)) return 'ko';
    if (/[A-Za-z]/.test(sourceText) && !/[\u4e00-\u9fff]/.test(sourceText)) return 'en';
    if (/[臺灣歡謝點請這裡個們後餐飲麵飯餃]/.test(sourceText)) return 'zh-TW';
    if (/[\u4e00-\u9fff]/.test(sourceText)) return 'zh-CN';
    return 'en';
}

function inferSourceLanguageFromText(sourceText = '') {
    if (/[ぁ-ゟ゠-ヿ]/.test(sourceText)) return 'ja';
    if (/[가-힣]/.test(sourceText)) return 'ko';
    if (/[A-Za-z]/.test(sourceText) && !/[\u4e00-\u9fff]/.test(sourceText)) return 'en';
    if (/[臺灣歡謝點請這裡個們後餐飲麵飯餃]/.test(sourceText)) return 'zh-TW';
    if (/[\u4e00-\u9fff]/.test(sourceText)) return 'zh-CN';
    return 'unknown';
}

function inferCurrencyFromText(text = '') {
    const upperText = toTrimmedString(text).toUpperCase();
    if (!upperText) return 'unknown';
    const directCodeMatch = upperText.match(new RegExp(`\\b(${currencyCodePattern})\\b`, 'i'));
    if (directCodeMatch && directCodeMatch[1]) return directCodeMatch[1].toUpperCase();
    if (/\bUSD\b|\$/.test(upperText)) return 'USD';
    if (/\bEUR\b|€/.test(upperText)) return 'EUR';
    if (/\bGBP\b|£/.test(upperText)) return 'GBP';
    if (/\bAUD\b/.test(upperText)) return 'AUD';
    if (/\bNZD\b/.test(upperText)) return 'NZD';
    if (/\bCAD\b/.test(upperText)) return 'CAD';
    if (/\bJPY\b|円|¥/.test(upperText)) return 'JPY';
    if (/\bCNY\b|RMB|￥/.test(upperText)) return 'CNY';
    if (/\bKRW\b|₩/.test(upperText)) return 'KRW';
    return 'unknown';
}

function stripMarkdownCodeFences(content = '') {
    const trimmed = toTrimmedString(content);
    if (trimmed.startsWith('```json')) {
        return trimmed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    if (trimmed.startsWith('```')) {
        return trimmed.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return trimmed;
}

async function requestJsonCompletion(messages, options = {}) {
    const rawContent = await requestTextCompletion(messages, options.model, options);
    try {
        return JSON.parse(stripMarkdownCodeFences(rawContent));
    } catch (error) {
        throw new UpstreamServiceError('Model returned invalid JSON.', 'INVALID_MODEL_RESPONSE');
    }
}

async function requestTextCompletion(messages, model = visionModel, options = {}) {
    const extraBody = {};
    if (typeof options.enableThinking === 'boolean') {
        extraBody.enable_thinking = options.enableThinking;
    }
    if (Number.isFinite(options.thinkingBudget) && options.thinkingBudget > 0) {
        extraBody.thinking_budget = Number(options.thinkingBudget);
    }

    const timeout = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
        ? Number(options.timeoutMs)
        : parseTimeoutMs;

    try {
        const completion = await openai.chat.completions.create({
            model,
            temperature: 0,
            messages,
            ...(Object.keys(extraBody).length ? { extra_body: extraBody } : {})
        }, {
            timeout
        });

        const content = stripMarkdownCodeFences(completion.choices[0].message.content || '');
        if (!content) {
            throw new UpstreamServiceError('Model returned an empty response.', 'EMPTY_MODEL_RESPONSE');
        }
        return content;
    } catch (error) {
        if (error instanceof HttpError) {
            throw error;
        }

        if (error && (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || /timeout/i.test(error.message || ''))) {
            throw new UpstreamServiceError('Model request timed out.', 'UPSTREAM_TIMEOUT', undefined, 504);
        }

        throw new UpstreamServiceError('Model request failed.', 'UPSTREAM_FAILURE');
    }
}

function chunkLines(lines, chunkSize = 12, maxChunks = 8) {
    const chunks = [];
    for (let index = 0; index < lines.length && chunks.length < maxChunks; index += chunkSize) {
        chunks.push(lines.slice(index, index + chunkSize));
    }
    return chunks;
}

function extractQuantityTexts(text = '') {
    return Array.from(
        toTrimmedString(text).matchAll(new RegExp(`\\d+\\s*${quantityUnitPattern.source}`, 'gi'))
    )
        .map((match) => toTrimmedString(match[0]))
        .filter(Boolean);
}

function inferEvidenceLineType(text, currency = 'unknown') {
    const normalized = toTrimmedString(text);
    if (!normalized) return 'unknown';

    const priceTexts = Array.from(normalized.matchAll(genericPriceTextPattern))
        .map((match) => toTrimmedString(match[0]))
        .filter((rawPriceText) => isLikelyRawPriceText(rawPriceText, currency));
    const quantityTexts = extractQuantityTexts(normalized);
    const hasPrice = priceTexts.length > 0;
    const hasQuantity = quantityTexts.length > 0;
    const looksLikeHeading = !hasPrice
        && !hasQuantity
        && normalized.length <= 48
        && (
            /^[A-ZÀ-ÖØ-Þ0-9 '&/-]+$/.test(normalized)
            || /^[\u3040-\u30ff\u4e00-\u9fffA-Za-z0-9 '&/-]{2,24}$/.test(normalized)
        );

    if (looksLikeHeading) return 'section_heading';
    if (addOnKeywordPattern.test(normalized) && hasPrice) return 'global_rule';
    if ((bonusKeywordPattern.test(normalized) || comboKeywordPattern.test(normalized)) && (hasPrice || hasQuantity)) return 'promotion_line';
    if (hasPrice && hasQuantity) return 'tier_candidate';
    if (hasPrice) return 'menu_line';
    if (addOnKeywordPattern.test(normalized) || bonusKeywordPattern.test(normalized) || comboKeywordPattern.test(normalized)) return 'rule_candidate';
    return 'note';
}

function buildLineEvidence(rawLines, currency = 'unknown') {
    const lines = [];
    let activeSectionId = 'section-1';
    let activeSectionHeading = '';
    let sectionIndex = 1;

    rawLines.forEach((lineText, index) => {
        const text = normalizeEvidenceLine(lineText);
        if (!text) return;

        const lineType = inferEvidenceLineType(text, currency);
        if (lineType === 'section_heading') {
            activeSectionId = `section-${sectionIndex}`;
            activeSectionHeading = text;
            sectionIndex += 1;
        }

        lines.push({
            id: `line-${index + 1}`,
            text,
            lineType,
            sectionId: activeSectionId,
            sectionHeading: activeSectionHeading,
            priceTexts: Array.from(text.matchAll(genericPriceTextPattern))
                .map((match) => toTrimmedString(match[0]))
                .filter((rawPriceText) => isLikelyRawPriceText(rawPriceText, currency)),
            quantityTexts: extractQuantityTexts(text)
        });
    });

    return lines;
}

function buildSectionsFromLineEvidence(lines = []) {
    const sections = [];
    const sectionMap = new Map();

    lines.forEach((line) => {
        const sectionId = line.sectionId || 'section-1';
        if (!sectionMap.has(sectionId)) {
            const entry = {
                id: sectionId,
                heading: line.lineType === 'section_heading' ? line.text : (line.sectionHeading || ''),
                lines: []
            };
            sectionMap.set(sectionId, entry);
            sections.push(entry);
        }

        const section = sectionMap.get(sectionId);
        if (line.lineType === 'section_heading') {
            section.heading = line.text;
            return;
        }

        if (section.lines.length < 12) {
            section.lines.push(line.text);
        }
    });

    return sections.slice(0, 8).filter((section) => section.heading || section.lines.length);
}

function extractFooterEvidenceLines(lines = []) {
    if (!lines.length) return [];
    const tailLines = lines.slice(-10);
    const matchedLines = tailLines.filter((line) =>
        addOnKeywordPattern.test(line)
        || bonusKeywordPattern.test(line)
        || new RegExp(`[$€£¥]|\\b(?:${CURRENCY_CODES.join('|')})\\b`, 'i').test(line)
    );
    return (matchedLines.length ? matchedLines : tailLines.slice(-4)).slice(0, 12);
}

function normalizeEvidenceLine(value) {
    return toTrimmedString(value).replace(/\s+/g, ' ');
}

function normalizeEvidenceSection(section, index) {
    const heading = normalizeEvidenceLine(section && section.heading);
    const lines = Array.isArray(section && section.lines)
        ? section.lines.map(normalizeEvidenceLine).filter(Boolean).slice(0, 12)
        : [];

    if (!heading && !lines.length) {
        return null;
    }

    return {
        id: `section-${index + 1}`,
        heading,
        lines
    };
}

function flattenOcrEvidenceLines(ocrEvidence) {
    if (ocrEvidence && Array.isArray(ocrEvidence.lines) && ocrEvidence.lines.length) {
        return ocrEvidence.lines.map((line) => toTrimmedString(line && line.text)).filter(Boolean);
    }
    return (ocrEvidence && Array.isArray(ocrEvidence.sections) ? ocrEvidence.sections : [])
        .flatMap((section) => {
            const heading = normalizeEvidenceLine(section && section.heading);
            const lines = Array.isArray(section && section.lines) ? section.lines.map(normalizeEvidenceLine).filter(Boolean) : [];
            return [heading, ...lines].filter(Boolean);
        });
}

function getSearchableEvidenceLines(ocrEvidence) {
    if (ocrEvidence && Array.isArray(ocrEvidence.lines) && ocrEvidence.lines.length) {
        return ocrEvidence.lines
            .filter((line) => ['menu_line', 'tier_candidate', 'promotion_line', 'global_rule'].includes(line.lineType))
            .map((line) => ({
                text: toTrimmedString(line && line.text),
                priceTexts: Array.isArray(line && line.priceTexts) ? line.priceTexts.map(toTrimmedString).filter(Boolean) : []
            }))
            .filter((line) => line.text);
    }

    return flattenOcrEvidenceLines(ocrEvidence).map((text) => ({
        text,
        priceTexts: extractPriceCandidatesFromLine(text, ocrEvidence && ocrEvidence.originalCurrency).map((candidate) => candidate.rawPriceText)
    }));
}

function normalizeComparableText(text = '') {
    return toTrimmedString(text)
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9\u00c0-\u024f\u3040-\u30ff\u4e00-\u9fff\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getMeaningfulTokens(text = '') {
    return normalizeComparableText(text)
        .split(' ')
        .filter((token) => token && token.length >= 3);
}

function extractPriceCandidatesFromLine(line, currency) {
    const text = toTrimmedString(line);
    if (!text) return [];

    const seen = new Set();
    return Array.from(text.matchAll(genericPriceTextPattern))
        .map((match) => toTrimmedString(match[0]))
        .filter(Boolean)
        .filter((rawPriceText) => isLikelyRawPriceText(rawPriceText, currency))
        .map((rawPriceText) => {
            const parsedPrice = parsePriceText(rawPriceText, currency);
            if (parsedPrice === null) {
                return null;
            }

            const key = `${rawPriceText}|${parsedPrice}`;
            if (seen.has(key)) {
                return null;
            }
            seen.add(key);

            return {
                rawPriceText,
                parsedPrice
            };
        })
        .filter(Boolean);
}

function findBestOcrPriceForItem(item, ocrEvidence, currency) {
    const targetName = item && item.originalName;
    const targetTokens = getMeaningfulTokens(targetName);
    if (!targetTokens.length) {
        return null;
    }

    const lines = getSearchableEvidenceLines(ocrEvidence);
    let bestMatch = null;

    lines.forEach((line) => {
        const lineText = toTrimmedString(line && line.text);
        const normalizedLine = normalizeComparableText(lineText);
        const priceCandidates = (Array.isArray(line && line.priceTexts) ? line.priceTexts : [])
            .map((rawPriceText) => {
                const parsedPrice = parsePriceText(rawPriceText, currency);
                return parsedPrice === null ? null : { rawPriceText, parsedPrice };
            })
            .filter(Boolean);
        if (!priceCandidates.length || !normalizedLine) {
            return;
        }

        const matchedTokens = targetTokens.filter((token) => normalizedLine.includes(token)).length;
        const containsFullName = normalizedLine.includes(normalizeComparableText(targetName));
        const score = containsFullName ? 100 + matchedTokens : matchedTokens;

        if (score < Math.max(2, Math.ceil(targetTokens.length / 2))) {
            return;
        }

        const candidatePrice = priceCandidates[priceCandidates.length - 1];
        if (!bestMatch || score > bestMatch.score) {
            bestMatch = {
                score,
                rawPriceText: candidatePrice.rawPriceText,
                parsedPrice: candidatePrice.parsedPrice,
                evidenceLine: lineText
            };
        }
    });

    return bestMatch;
}

function reconcileItemsWithOcrEvidence(items, ocrEvidence, exchangeRate, originalCurrency) {
    return (items || []).map((item) => {
        const ocrPriceMatch = findBestOcrPriceForItem(item, ocrEvidence, originalCurrency);
        if (!ocrPriceMatch) {
            return item;
        }

        const ocrPrice = ocrPriceMatch.parsedPrice;
        const currentPrice = Number(item && item.originalPrice);
        const shouldReplace = !Number.isFinite(currentPrice)
            || isSuspiciousWesternIntegerPrice(currentPrice, originalCurrency)
            || Math.abs(currentPrice - ocrPrice) >= 1;

        if (!shouldReplace) {
            return {
                ...item,
                originalPriceText: item.originalPriceText || ocrPriceMatch.rawPriceText,
                priceEvidenceLine: item.priceEvidenceLine || ocrPriceMatch.evidenceLine
            };
        }

        const normalizedPrice = roundPrice(ocrPrice, 2);
        return {
            ...item,
            originalPriceText: ocrPriceMatch.rawPriceText,
            priceEvidenceLine: ocrPriceMatch.evidenceLine,
            originalPrice: normalizedPrice,
            displayOriginalPrice: normalizedPrice,
            convertedPrice: convertPrice(normalizedPrice, exchangeRate),
            displayConvertedPrice: convertPrice(normalizedPrice, exchangeRate)
        };
    });
}

function normalizeOcrEvidence(payload) {
    if (typeof payload === 'string') {
        const rawText = payload;
        const rawLines = rawText
            .split(/\r?\n/)
            .map(normalizeEvidenceLine)
            .filter(Boolean)
            .slice(0, 96);
        const originalCurrency = inferCurrencyFromText(rawText);
        const lines = buildLineEvidence(rawLines, originalCurrency);
        const sections = buildSectionsFromLineEvidence(lines);

        return {
            sourceLanguage: inferSourceLanguageFromText(rawText),
            originalCurrency,
            layout: 'unknown',
            lines,
            sections,
            footerLines: extractFooterEvidenceLines(rawLines),
            notes: []
        };
    }

    const originalCurrency = normalizeCurrencyCode(payload && payload.originalCurrency) || 'unknown';
    const sections = Array.isArray(payload && payload.sections)
        ? payload.sections.map((section, index) => normalizeEvidenceSection(section, index)).filter(Boolean).slice(0, 8)
        : [];
    const rawLines = Array.isArray(payload && payload.lines)
        ? payload.lines
            .map((line, index) => ({
                id: toTrimmedString(line && line.id) || `line-${index + 1}`,
                text: normalizeEvidenceLine(line && line.text),
                lineType: toTrimmedString(line && line.lineType) || inferEvidenceLineType(line && line.text, originalCurrency),
                sectionId: toTrimmedString(line && line.sectionId) || 'section-1',
                sectionHeading: normalizeEvidenceLine(line && line.sectionHeading),
                priceTexts: Array.isArray(line && line.priceTexts) ? line.priceTexts.map(normalizeEvidenceLine).filter(Boolean) : [],
                quantityTexts: Array.isArray(line && line.quantityTexts) ? line.quantityTexts.map(normalizeEvidenceLine).filter(Boolean) : []
            }))
            .filter((line) => line.text)
            .slice(0, 96)
        : [];
    const lines = rawLines.length
        ? rawLines
        : buildLineEvidence(flattenOcrEvidenceLines({ sections }), originalCurrency);
    const footerLines = Array.isArray(payload && payload.footerLines)
        ? payload.footerLines.map(normalizeEvidenceLine).filter(Boolean).slice(0, 12)
        : [];
    const notes = Array.isArray(payload && payload.notes)
        ? payload.notes.map(normalizeEvidenceLine).filter(Boolean).slice(0, 8)
        : [];

    return {
        sourceLanguage: toTrimmedString(payload && payload.sourceLanguage) || 'unknown',
        originalCurrency,
        layout: toTrimmedString(payload && payload.layout) || 'unknown',
        lines,
        sections: sections.length ? sections : buildSectionsFromLineEvidence(lines),
        footerLines,
        notes
    };
}

function buildOcrEvidenceMessages(base64Image, mimeType) {
    return [
        {
            role: 'system',
            content: `You are an OCR model.
Please output only the original text content visible in the menu image.
Preserve decimal points and currency symbols exactly as shown. Never turn $3.50 into 350, 9.50 into 950, or 14.00 into 1400.
Do not translate, do not summarize, do not explain, and do not output JSON.
Keep line breaks when possible so dish names and prices remain readable.`
        },
        {
            role: 'user',
            content: [
                { type: 'text', text: '请仅输出图像中的文本内容。' },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                    }
                }
            ]
        }
    ];
}

function serializeOcrEvidenceForParse(ocrEvidence) {
    return {
        sourceLanguage: ocrEvidence.sourceLanguage,
        originalCurrency: ocrEvidence.originalCurrency,
        layout: ocrEvidence.layout,
        lines: (ocrEvidence.lines || []).slice(0, 80).map((line) => ({
            id: line.id,
            text: line.text,
            lineType: line.lineType,
            sectionHeading: line.sectionHeading || '',
            priceTexts: line.priceTexts || [],
            quantityTexts: line.quantityTexts || []
        })),
        footerLines: (ocrEvidence.footerLines || []).slice(0, 12),
        notes: (ocrEvidence.notes || []).slice(0, 8)
    };
}

function buildEvidenceParseMessages(ocrEvidence, targetLang) {
    const serializedEvidence = serializeOcrEvidenceForParse(ocrEvidence);
    return [
        {
            role: 'system',
            content: `You are an expert AI menu parser.
You will receive compact line-level OCR evidence extracted from a restaurant menu.
Each line includes lineType, sectionHeading, priceTexts, and quantityTexts.
OCR evidence is the primary source of truth for original names, prices, decimal points, currency symbols, and footer promotions.
Use OCR evidence first for prices. Never turn $3.50 into 350, 9.50 into 950, or 14.00 into 1400.
For USD, EUR, GBP, AUD, and NZD menus, preserve two decimal places when the OCR evidence shows decimals.
Your job is to structure the menu, infer categories, identify tiered pricing, bundles, add-ons, bonus items, and translate names/categories to ${targetLang}.
PRIORITY RULES:
1. If lineType is tier_candidate and the same dish has multiple quantity+price options, use itemType "tiered" and fill tiers.
2. If a line or section heading contains セット, ミックス, 盛り合わせ, combo, mix, basket, or similar wording, prefer itemType "bundle".
3. If a line shows 追加, +price, add-on, topping, sauce charge, or free bonus text, attach it as addOns or bonusItems instead of treating it as a standalone dish.
4. If footerLines or global_rule lines contain shared add-on rules, return them in top-level globalAddOns and keep the original footer text in globalPromotionText.
5. sectionHeading is strong category evidence. Prefer it over guessing categories from dish text.
6. If structure is uncertain, keep rawPromotionText and set parseMode to "partial".
OUTPUT CONSTRAINTS:
- A dish with multiple prices must not be returned as itemType "single" unless you are certain those prices belong to unrelated items.
- Prefer partial structured output over oversimplified output.
- Use OCR line evidence as the source for originalName, originalLabel, rawPromotionText, originalPriceText, and originalPriceDeltaText.
Return ONLY a JSON object with this exact structure:
{
  "sourceLanguage": "Source language tag of the original menu, use one of zh-CN, zh-TW, ja, ko, en",
  "originalCurrency": "Currency Code (e.g. USD, JPY)",
  "globalPromotionText": "Original footer/global promotion text when visible",
  "globalAddOns": [
    {
      "label": "Translated global add-on label in ${targetLang}",
      "originalLabel": "Original global add-on label",
      "translatedLabel": "Translated global add-on label in ${targetLang}",
      "originalPriceDelta": 3.50,
      "note": "Optional short note"
    }
  ],
  "items": [
    {
      "category": "Translated category name in ${targetLang}",
      "originalName": "Original food name",
      "translatedName": "Translated food name in ${targetLang}",
      "itemType": "single | tiered | bundle",
      "originalPriceText": "$14.00",
      "originalPrice": 14.00,
      "tiers": [
        {
          "label": "Translated tier label in ${targetLang}",
          "originalLabel": "Original tier label",
          "translatedLabel": "Translated tier label in ${targetLang}",
          "quantity": 3,
          "originalPriceText": "$9.50",
          "originalPrice": 9.50,
          "note": "Optional short note"
        }
      ],
      "bundleItems": [
        {
          "originalName": "Original included item name",
          "translatedName": "Translated included item name in ${targetLang}",
          "quantity": 1,
          "note": "Optional short note"
        }
      ],
      "addOns": [
        {
          "label": "Translated add-on label in ${targetLang}",
          "originalLabel": "Original add-on label",
          "translatedLabel": "Translated add-on label in ${targetLang}",
          "originalPriceDeltaText": "$3.50",
          "originalPriceDelta": 3.50,
          "note": "Optional short note"
        }
      ],
      "bonusItems": [
        {
          "label": "Translated bonus label in ${targetLang}",
          "originalLabel": "Original bonus label",
          "translatedLabel": "Translated bonus label in ${targetLang}",
          "quantity": 1,
          "note": "Optional short note"
        }
      ],
      "promotionSummary": "Short translated summary in ${targetLang}",
      "rawPromotionText": "Original promotion text if partially structured or needs fallback",
      "parseMode": "basic | structured | partial"
    }
  ]
}`
        },
        {
            role: 'user',
            content: `Parse this menu using the OCR line evidence below as the primary source of truth for original text and prices.\n${JSON.stringify(serializedEvidence)}`
        }
    ];
}

app.get('/health', (req, res) => {
    res.json({ ok: true });
});

app.get('/api/v1/exchange-rate', async (req, res, next) => {
    try {
        const fromCurrency = ensureSupportedCurrency(req.query.from || 'USD', 'from');
        const toCurrency = ensureSupportedCurrency(req.query.to || 'CNY', 'to');
        const exchangeRate = await resolveExchangeRate(fromCurrency, toCurrency);

        res.json({
            fromCurrency,
            toCurrency,
            exchangeRate,
            originalCurrencyMeta: {
                code: fromCurrency,
                fractionDigits: getCurrencyFractionDigits(fromCurrency)
            },
            targetCurrencyMeta: {
                code: toCurrency,
                fractionDigits: getCurrencyFractionDigits(toCurrency)
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post('/api/v1/menu/parse', upload.single('image'), async (req, res, next) => {
    try {
        validateUploadedImage(req.file);

        const targetLang = ensureAllowedTargetLanguage(req.body && req.body.targetLang);
        const targetCurrency = ensureSupportedCurrency((req.body && req.body.targetCurrency) || 'CNY', 'targetCurrency');

        const base64Image = req.file.buffer.toString('base64');
        const mimeType = normalizeUploadedMimeType(req.file.mimetype);

        const rawOcrText = await requestTextCompletion(buildOcrEvidenceMessages(base64Image, mimeType), ocrModel, {
            enableThinking: false,
            timeoutMs: ocrTimeoutMs
        });
        const ocrEvidence = normalizeOcrEvidence(rawOcrText);
        const aiResponse = await requestJsonCompletion(buildEvidenceParseMessages(ocrEvidence, targetLang), {
            model: visionModel,
            enableThinking: parseEnableThinking,
            thinkingBudget: parseThinkingBudget,
            timeoutMs: parseTimeoutMs
        });
        const sourceLanguage = aiResponse.sourceLanguage || (ocrEvidence.sourceLanguage !== 'unknown' ? ocrEvidence.sourceLanguage : inferSourceLanguage(aiResponse.items || []));
        const originalCurrency = resolveOriginalCurrency(aiResponse.originalCurrency, ocrEvidence.originalCurrency);
        if (!originalCurrency) {
            throw new UpstreamServiceError('Parser did not return a supported original currency.', 'UNSUPPORTED_ORIGINAL_CURRENCY');
        }
        let items = Array.isArray(aiResponse.items) ? aiResponse.items : [];

        const exchangeRate = await resolveExchangeRate(originalCurrency, targetCurrency);

        items = items.map((item, index) => normalizeParsedItem(item, index, exchangeRate, originalCurrency));
        items = reconcileItemsWithOcrEvidence(items, ocrEvidence, exchangeRate, originalCurrency);
        const globalAddOns = inferGlobalAddOns(aiResponse, exchangeRate, originalCurrency);
        const originalCurrencyMeta = {
            code: originalCurrency,
            fractionDigits: getCurrencyFractionDigits(originalCurrency)
        };
        const targetCurrencyCode = normalizeCurrencyCode(targetCurrency);
        const targetCurrencyMeta = {
            code: targetCurrencyCode,
            fractionDigits: getCurrencyFractionDigits(targetCurrencyCode)
        };
        const globalPromotionText = normalizeGlobalPromotionText(
            aiResponse.globalPromotionText
            || aiResponse.globalAddOnText
            || aiResponse.footerText
            || ocrEvidence.footerLines.join(' / ')
        );

        res.json({
            sourceLanguage,
            originalCurrency,
            targetCurrency,
            originalCurrencyMeta,
            targetCurrencyMeta,
            exchangeRate,
            globalPromotionText,
            globalAddOns,
            items
        });

    } catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({
                error: 'Uploaded image is too large.',
                code: 'FILE_TOO_LARGE'
            });
            return;
        }

        res.status(400).json({
            error: 'Invalid multipart upload.',
            code: 'INVALID_MULTIPART_UPLOAD'
        });
        return;
    }

    if (error instanceof HttpError) {
        const payload = {
            error: error.message,
            code: error.errorCode
        };
        if (error.details) {
            payload.details = error.details;
        }
        res.status(error.statusCode).json(payload);
        return;
    }

    console.error('Unhandled backend error:', {
        message: error && error.message,
        code: error && error.code,
        stack: error && error.stack
    });
    res.status(500).json({
        error: 'Internal server error.',
        code: 'INTERNAL_SERVER_ERROR'
    });
});

function startServer(listenPort = port) {
    return app.listen(listenPort, () => {
        console.log(`Backend listening on port ${listenPort}`);
    });
}

if (require.main === module) {
    startServer(port);
}

module.exports = {
    app,
    startServer,
    HttpError,
    UpstreamServiceError,
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
    validateUploadedImage
};
