const { CURRENCY_METADATA } = require('../shared/currency-data');
const { toTrimmedString } = require('./utils');

function normalizeCurrencyCode(value) {
    return toTrimmedString(value).toUpperCase();
}

function isSupportedCurrency(value) {
    const { supportedCurrencyCodes } = require('../config');
    return supportedCurrencyCodes.has(normalizeCurrencyCode(value));
}

function ensureSupportedCurrency(value, fieldName) {
    const { HttpError } = require('../errors');
    const currency = normalizeCurrencyCode(value);
    if (!currency || !isSupportedCurrency(currency)) {
        throw new HttpError(400, 'INVALID_CURRENCY', `Unsupported ${fieldName}.`);
    }
    return currency;
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
    const { westernDecimalCurrencies } = require('../config');
    return westernDecimalCurrencies.has(normalizeCurrencyCode(currency));
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

function inferCurrencyFromText(text = '') {
    const { currencyCodePattern } = require('../config');
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

module.exports = {
    normalizeCurrencyCode,
    isSupportedCurrency,
    ensureSupportedCurrency,
    getCurrencyMeta,
    getCurrencyFractionDigits,
    isWesternDecimalCurrency,
    resolveOriginalCurrency,
    inferCurrencyFromText
};
