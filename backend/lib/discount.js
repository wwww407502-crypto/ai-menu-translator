const {
    toTrimmedString,
    toOptionalString,
    toOptionalPriceNumber,
    roundPrice,
    convertPrice,
    parsePositiveInteger
} = require('./utils');
const { resolvePriceValue } = require('./price');
const {
    supportedDiscountRuleTypes,
    discountKeywordPattern
} = require('../config');

function normalizeDiscountPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
    }
    if (numeric <= 1) {
        return roundPrice(numeric * 100, 2);
    }
    if (numeric <= 100) {
        return roundPrice(numeric, 2);
    }
    return null;
}

function inferDiscountRuleType(text = '') {
    const normalized = toTrimmedString(text);
    if (!normalized) return 'raw';
    if (/[买買]\s*[一二两兩三四五六七八九十\d]+.*[送赠贈]|buy\s*\d+.*get\s*\d+/i.test(normalized)) {
        return 'buy_x_get_y';
    }
    if (/第\s*[一二两兩三四五六七八九十\d]+.*(半价|半價|五折|50\s*%)|\b(?:2nd|3rd|4th|5th)\b.*(half|50\s*%)/i.test(normalized)) {
        return 'nth_item_discount';
    }
    if (/\d{1,2}\s*%\s*off|\d(?:\.\d)?\s*折/i.test(normalized)) {
        return 'percentage_discount';
    }
    if (/[满滿]\s*\d+.*[减減-]\s*\d+|\b\d+(?:\.\d{1,2})?\s*off\b/i.test(normalized)) {
        return 'amount_off';
    }
    if (/\b\d+\s*(?:for|\/)\s*[$€£¥￥₩]?\s*\d|\d+\s*(?:件|份|个|個|杯|串|本|pcs?|pieces?).*(?:优惠|優惠|特价|特價|只要|for|=|:|：)/i.test(normalized)) {
        return 'bundle_price';
    }
    return discountKeywordPattern.test(normalized) ? 'raw' : 'raw';
}

function normalizeDiscountRuleType(value, fallbackText = '') {
    const normalized = toTrimmedString(value).toLowerCase().replace(/-/g, '_');
    const aliases = {
        fixed_bundle_price: 'bundle_price',
        multi_buy_price: 'bundle_price',
        bundleprice: 'bundle_price',
        buy_get: 'buy_x_get_y',
        buyxgety: 'buy_x_get_y',
        bogo: 'buy_x_get_y',
        second_half_price: 'nth_item_discount',
        nth_discount: 'nth_item_discount',
        percent_off: 'percentage_discount',
        percentage_off: 'percentage_discount',
        discount_percent: 'percentage_discount',
        money_off: 'amount_off',
        fixed_discount: 'amount_off'
    };
    const resolved = aliases[normalized] || normalized;
    if (supportedDiscountRuleTypes.has(resolved)) {
        return resolved;
    }
    return inferDiscountRuleType(fallbackText);
}

function normalizeDiscountRule(rule, index, exchangeRate, originalCurrency, candidateText = '') {
    const sourceText = [
        rule && rule.originalLabel,
        rule && rule.translatedLabel,
        rule && rule.label,
        rule && rule.rawRuleText,
        rule && rule.rawPromotionText,
        rule && rule.promotionText,
        rule && rule.description,
        rule && rule.note,
        candidateText
    ].map((value) => toTrimmedString(value)).filter(Boolean).join(' | ');
    const type = normalizeDiscountRuleType(rule && (rule.type || rule.ruleType), sourceText);
    const originalLabel = toOptionalString(rule && (rule.originalLabel || rule.label || rule.title))
        || toOptionalString(rule && (rule.rawRuleText || rule.rawPromotionText));
    const translatedLabel = toOptionalString(rule && (rule.translatedLabel || rule.label || rule.title)) || originalLabel;
    const rawRuleText = toOptionalString(rule && (rule.rawRuleText || rule.rawPromotionText || rule.promotionText || rule.description));
    const minQuantity = parsePositiveInteger(rule && (
        rule.minQuantity
        ?? rule.quantity
        ?? rule.quantityThreshold
        ?? rule.buyQuantity
        ?? rule.requiredQuantity
    ));
    const paidQuantity = parsePositiveInteger(rule && (
        rule.paidQuantity
        ?? rule.buyQuantity
        ?? (type === 'buy_x_get_y' ? minQuantity : null)
    ));
    const freeQuantity = parsePositiveInteger(rule && (rule.freeQuantity ?? rule.getQuantity ?? rule.bonusQuantity));
    const appliesToQuantity = parsePositiveInteger(rule && (rule.appliesToQuantity ?? rule.nthQuantity ?? rule.discountedQuantity));
    const minSpend = resolvePriceValue(
        rule && (rule.minSpendText || rule.spendThresholdText),
        rule && (rule.minSpend ?? rule.spendThreshold),
        originalCurrency,
        sourceText
    );
    const originalPriceText = toOptionalString(rule && (
        rule.originalPriceText
        || rule.bundlePriceText
        || rule.priceText
        || rule.rawPriceText
    ));
    const originalPrice = resolvePriceValue(
        originalPriceText,
        rule && (rule.originalPrice ?? rule.bundlePrice ?? rule.price),
        originalCurrency,
        sourceText
    );
    const discountAmountText = toOptionalString(rule && (
        rule.originalDiscountAmountText
        || rule.discountAmountText
        || rule.amountOffText
    ));
    const discountAmount = resolvePriceValue(
        discountAmountText,
        rule && (rule.discountAmount ?? rule.originalDiscountAmount ?? rule.amountOff),
        originalCurrency,
        sourceText
    );
    const discountPercent = normalizeDiscountPercent(rule && (
        rule.discountPercent
        ?? rule.percentOff
        ?? rule.percentageOff
    ));
    const note = toOptionalString(rule && rule.note);
    const hasRuleData = Boolean(
        originalLabel
        || translatedLabel
        || rawRuleText
        || minQuantity
        || paidQuantity
        || freeQuantity
        || appliesToQuantity
        || originalPrice !== null
        || discountAmount !== null
        || discountPercent !== null
        || minSpend !== null
    );

    if (!hasRuleData) {
        return null;
    }

    return {
        id: toTrimmedString(rule && rule.id) || `discount-${index + 1}`,
        type,
        originalLabel,
        translatedLabel,
        rawRuleText,
        minQuantity,
        paidQuantity,
        freeQuantity,
        appliesToQuantity,
        minSpend: minSpend === null ? null : roundPrice(minSpend, 2),
        originalPriceText,
        originalPrice: originalPrice === null ? null : roundPrice(originalPrice, 2),
        convertedPrice: originalPrice === null ? null : convertPrice(originalPrice, exchangeRate),
        discountAmountText,
        discountAmount: discountAmount === null ? null : roundPrice(discountAmount, 2),
        convertedDiscountAmount: discountAmount === null ? null : convertPrice(discountAmount, exchangeRate),
        discountPercent,
        note
    };
}

module.exports = {
    normalizeDiscountPercent,
    inferDiscountRuleType,
    normalizeDiscountRuleType,
    normalizeDiscountRule
};
