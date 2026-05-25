const {
    toTrimmedString,
    toOptionalString,
    toOptionalPriceNumber,
    roundPrice,
    convertPrice,
    countPriceTextMatches
} = require('./utils');
const {
    getCurrencyMeta,
    getCurrencyFractionDigits,
    isWesternDecimalCurrency,
    normalizeCurrencyCode
} = require('./currency');
const {
    currencyCodePattern,
    currencySymbolPattern,
    priceNumberPattern,
    quantityUnitPattern
} = require('../config');

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
        .replace(new RegExp(`\\b(?:${currencyCodePattern})\\b`, 'gi'), '')
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

module.exports = {
    isLikelyRawPriceText,
    parsePriceText,
    resolvePriceValue,
    extractDecimalPriceCandidates,
    isSuspiciousWesternIntegerPrice,
    maybeRestoreDecimalPrice,
    shouldPreferInferredPrices
};
