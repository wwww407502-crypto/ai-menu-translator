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

function parsePositiveInteger(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.floor(value);
    }

    const text = toTrimmedString(value);
    if (!text) {
        return null;
    }

    const digitMatch = text.match(/\d+/);
    if (digitMatch) {
        const numeric = Number(digitMatch[0]);
        return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : null;
    }

    return parseChinesePositiveInteger(text);
}

function parseChinesePositiveInteger(text) {
    const chineseDigits = {
        一: 1,
        二: 2,
        两: 2,
        兩: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9
    };

    if (text === '十') {
        return 10;
    }

    const parseTwoDigit = (chunk) => {
        if (!chunk) return 0;
        if (chunk === '十') return 10;
        const cleaned = chunk.replace(/零/g, '');
        if (!cleaned) return 0;
        const tenIndex = cleaned.indexOf('十');
        if (tenIndex >= 0) {
            const tensText = cleaned.slice(0, tenIndex);
            const onesText = cleaned.slice(tenIndex + 1);
            const tens = tensText ? (chineseDigits[tensText] || 1) : 1;
            const ones = onesText ? (chineseDigits[onesText] || 0) : 0;
            return tens * 10 + ones;
        }
        return chineseDigits[cleaned] || 0;
    };

    const hundredIndex = text.indexOf('百');
    if (hundredIndex >= 0) {
        const hundredsText = text.slice(0, hundredIndex);
        const remainderText = text.slice(hundredIndex + 1);
        const hundreds = hundredsText ? (chineseDigits[hundredsText] || 1) : 1;
        const remainder = parseTwoDigit(remainderText);
        const total = hundreds * 100 + remainder;
        return Number.isFinite(total) && total > 0 ? total : null;
    }

    const result = parseTwoDigit(text);
    return Number.isFinite(result) && result > 0 ? result : null;
}

function createRequestId() {
    const crypto = require('crypto');
    return crypto.randomBytes(8).toString('hex');
}

function getErrorSearchText(error) {
    const upstreamPayload = error && (error.error || (error.response && error.response.data)) || null;
    return [
        error && error.code,
        error && error.name,
        error && error.message,
        upstreamPayload && upstreamPayload.code,
        upstreamPayload && upstreamPayload.message
    ].map((value) => toTrimmedString(value)).filter(Boolean).join(' ');
}

function isTimeoutError(error) {
    return /(?:timeout|timed\s*out|deadline|etimedout|econnaborted|aborterror|aborted)/i.test(getErrorSearchText(error));
}

function isRetriableUpstreamConnectionError(error) {
    return /connection error|socket hang up|econnreset|econnrefused|fetch failed|network error|other side closed/i
        .test(getErrorSearchText(error));
}

function extractUpstreamErrorDetails(error) {
    const upstreamPayload = error && (error.error || (error.response && error.response.data)) || null;
    return {
        upstreamStatus: error && (error.status || (error.response && error.response.status)) || null,
        upstreamCode: error && error.code || (upstreamPayload && upstreamPayload.code) || null,
        upstreamType: upstreamPayload && upstreamPayload.type || null,
        upstreamMessage: upstreamPayload && upstreamPayload.message || (error && error.message) || 'Unknown upstream error'
    };
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

function chunkLines(lines, chunkSize = 12, maxChunks = 8) {
    const chunks = [];
    for (let index = 0; index < lines.length && chunks.length < maxChunks; index += chunkSize) {
        chunks.push(lines.slice(index, index + chunkSize));
    }
    return chunks;
}

function extractQuantityTexts(text = '') {
    const { quantityUnitPattern } = require('./config');
    return Array.from(
        toTrimmedString(text).matchAll(new RegExp(`\\d+\\s*${quantityUnitPattern.source}`, 'gi'))
    )
        .map((match) => toTrimmedString(match[0]))
        .filter(Boolean);
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

function countPriceTextMatches(text = '') {
    const { genericPriceTextPattern } = require('../config');
    return (toTrimmedString(text).match(genericPriceTextPattern) || []).length;
}

module.exports = {
    toTrimmedString,
    toOptionalString,
    toOptionalNumber,
    toOptionalPriceNumber,
    roundPrice,
    convertPrice,
    parsePositiveInteger,
    parseChinesePositiveInteger,
    createRequestId,
    getErrorSearchText,
    isTimeoutError,
    isRetriableUpstreamConnectionError,
    extractUpstreamErrorDetails,
    stripMarkdownCodeFences,
    chunkLines,
    extractQuantityTexts,
    ensureUniqueById,
    countPriceTextMatches
};
