const {
    toTrimmedString,
    toOptionalString,
    countPriceTextMatches
} = require('./utils');
const { normalizeAddOn } = require('./item-normalizer');
const { normalizeDiscountRule } = require('./discount');
const { extractDiscountRulesFromText, extractAddOnsFromText } = require('./extraction');
const {
    addOnKeywordPattern
} = require('../config');

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

function inferGlobalDiscountRules(payload, exchangeRate, originalCurrency) {
    const explicitGlobalDiscountRules = Array.isArray(payload && payload.globalDiscountRules)
        ? payload.globalDiscountRules.map((rule, index) => normalizeDiscountRule(rule, index, exchangeRate, originalCurrency)).filter(Boolean)
        : [];
    if (explicitGlobalDiscountRules.length) {
        return explicitGlobalDiscountRules;
    }

    const fallbackText = [
        payload && payload.globalPromotionText,
        payload && payload.globalDiscountText,
        payload && payload.footerNotes,
        payload && payload.footerText,
        payload && payload.bottomNotes
    ]
        .map((value) => toTrimmedString(value))
        .filter(Boolean)
        .join(' | ');

    return extractDiscountRulesFromText(fallbackText, exchangeRate, originalCurrency);
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

module.exports = {
    inferGlobalAddOns,
    inferGlobalDiscountRules,
    isLikelyCatalogPromotionText,
    normalizeGlobalPromotionText
};
