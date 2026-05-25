const {
    toTrimmedString,
    toOptionalString,
    toOptionalPriceNumber,
    roundPrice,
    convertPrice,
    parsePositiveInteger,
    ensureUniqueById
} = require('./utils');
const { normalizeDiscountRule, normalizeDiscountPercent } = require('./discount');
const {
    currencyCodePattern,
    currencySymbolPattern,
    priceNumberBodyPattern,
    priceNumberPattern,
    discountKeywordPattern,
    comboKeywordPattern,
    addOnKeywordPattern,
    bonusKeywordPattern,
    quantityUnitPattern
} = require('../config');

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

    const tierCandidates = [];
    const seen = new Set();
    const pushTier = ({ quantity, unit, price, rawLabel }) => {
        const normalizedQuantity = parsePositiveInteger(quantity);
        const originalPrice = toOptionalPriceNumber(price);
        if (!normalizedQuantity || originalPrice === null) {
            return;
        }

        const originalLabel = toTrimmedString(rawLabel) || `${normalizedQuantity}${unit || ''}`;
        const key = `${normalizedQuantity}|${originalPrice}|${originalLabel}`;
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        tierCandidates.push({
            id: createTierIdFromLabel(originalLabel, tierCandidates.length),
            label: originalLabel,
            originalLabel,
            translatedLabel: originalLabel,
            quantity: normalizedQuantity,
            originalPrice: roundPrice(originalPrice, 2),
            convertedPrice: convertPrice(originalPrice, exchangeRate),
            note: null
        });
    };

    Array.from(
        text.matchAll(new RegExp(
            `(?<quantity>\\d+)\\s*(?<unit>ヶ|個|个|本|枚|皿|人前|セット|份|件|杯|串|pcs?|pieces?)\\s*(?:[:：/\\-x× ]+)?\\s*(?:得\\s*)?(?<currency>${currencyCodePattern}|${currencySymbolPattern})?\\s*(?<price>${priceNumberBodyPattern})\\s*(?:円|元|ドル|usd|eur|gbp|aud|nzd|cad)?`,
            'gi'
        ))
    ).forEach((match) => {
        pushTier({
            quantity: match.groups && match.groups.quantity,
            unit: match.groups && match.groups.unit,
            price: `${match.groups && match.groups.currency ? match.groups.currency : ''}${match.groups && match.groups.price ? match.groups.price : ''}`,
            rawLabel: `${match.groups && match.groups.quantity ? match.groups.quantity : ''}${match.groups && match.groups.unit ? match.groups.unit : ''}`
        });
    });

    Array.from(
        text.matchAll(new RegExp(
            `(?<quantity>\\d+)\\s*(?:pcs?|pieces?|items?|orders?)?\\s*for\\s*(?<currency>${currencyCodePattern}|${currencySymbolPattern})?\\s*(?<price>${priceNumberBodyPattern})`,
            'gi'
        ))
    ).forEach((match) => {
        const quantity = match.groups && match.groups.quantity;
        pushTier({
            quantity,
            unit: 'pcs',
            price: `${match.groups && match.groups.currency ? match.groups.currency : ''}${match.groups && match.groups.price ? match.groups.price : ''}`,
            rawLabel: `${quantity} for`
        });
    });

    return tierCandidates;
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

function extractDiscountRulesFromText(text, exchangeRate, originalCurrency) {
    const normalized = toTrimmedString(text);
    if (!normalized || !discountKeywordPattern.test(normalized)) {
        return [];
    }

    const rules = [];
    const seen = new Set();
    const pushRule = (rule) => {
        const normalizedRule = normalizeDiscountRule(rule, rules.length, exchangeRate, originalCurrency, normalized);
        if (!normalizedRule) {
            return;
        }
        const key = [
            normalizedRule.type,
            normalizedRule.originalLabel,
            normalizedRule.minQuantity,
            normalizedRule.paidQuantity,
            normalizedRule.freeQuantity,
            normalizedRule.appliesToQuantity,
            normalizedRule.originalPrice,
            normalizedRule.discountAmount,
            normalizedRule.discountPercent
        ].join('|');
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        rules.push(normalizedRule);
    };

    Array.from(normalized.matchAll(/[买買]\s*(?<buy>[一二两兩三四五六七八九十\d]+)\s*(?:份|件|个|個|杯|串|本|pcs?|pieces?)?\s*(?:送|赠|贈)\s*(?<free>[一二两兩三四五六七八九十\d]+)/gi))
        .forEach((match) => {
            pushRule({
                type: 'buy_x_get_y',
                originalLabel: match[0],
                rawRuleText: match[0],
                minQuantity: parsePositiveInteger(match.groups && match.groups.buy),
                paidQuantity: parsePositiveInteger(match.groups && match.groups.buy),
                freeQuantity: parsePositiveInteger(match.groups && match.groups.free)
            });
        });

    Array.from(normalized.matchAll(/buy\s*(?<buy>\d+)\s*(?:[a-z\s]{0,16})?get\s*(?<free>\d+)/gi))
        .forEach((match) => {
            pushRule({
                type: 'buy_x_get_y',
                originalLabel: match[0],
                rawRuleText: match[0],
                minQuantity: parsePositiveInteger(match.groups && match.groups.buy),
                paidQuantity: parsePositiveInteger(match.groups && match.groups.buy),
                freeQuantity: parsePositiveInteger(match.groups && match.groups.free)
            });
        });

    Array.from(normalized.matchAll(/第\s*(?<nth>[一二两兩三四五六七八九十\d]+)\s*(?:份|件|个|個|杯|串|本)?\s*(?:半价|半價|五折|50\s*%\s*(?:off)?)/gi))
        .forEach((match) => {
            pushRule({
                type: 'nth_item_discount',
                originalLabel: match[0],
                rawRuleText: match[0],
                appliesToQuantity: parsePositiveInteger(match.groups && match.groups.nth),
                discountPercent: 50
            });
        });

    Array.from(normalized.matchAll(/\b(?<nth>\d+)(?:nd|rd|th)\s*(?:item|one|piece|dish|order)?\s*(?:half\s*price|50\s*%\s*off)/gi))
        .forEach((match) => {
            pushRule({
                type: 'nth_item_discount',
                originalLabel: match[0],
                rawRuleText: match[0],
                appliesToQuantity: parsePositiveInteger(match.groups && match.groups.nth),
                discountPercent: 50
            });
        });

    if (/\bsecond\s+(?:item|one|piece|dish|order)?\s*(?:half\s*price|50\s*%\s*off)/i.test(normalized)) {
        const match = normalized.match(/\bsecond\s+(?:item|one|piece|dish|order)?\s*(?:half\s*price|50\s*%\s*off)/i);
        pushRule({
            type: 'nth_item_discount',
            originalLabel: match && match[0],
            rawRuleText: match && match[0],
            appliesToQuantity: 2,
            discountPercent: 50
        });
    }

    Array.from(normalized.matchAll(/(?<percent>\d{1,2})\s*%\s*off/gi))
        .forEach((match) => {
            pushRule({
                type: 'percentage_discount',
                originalLabel: match[0],
                rawRuleText: match[0],
                discountPercent: normalizeDiscountPercent(match.groups && match.groups.percent)
            });
        });

    Array.from(normalized.matchAll(/(?<fold>\d(?:\.\d)?)\s*折/gi))
        .forEach((match) => {
            const fold = Number(match.groups && match.groups.fold);
            if (!Number.isFinite(fold) || fold <= 0 || fold >= 10) {
                return;
            }
            pushRule({
                type: 'percentage_discount',
                originalLabel: match[0],
                rawRuleText: match[0],
                discountPercent: roundPrice(100 - fold * 10, 2)
            });
        });

    Array.from(normalized.matchAll(new RegExp(`[满滿]\\s*(?<threshold>${priceNumberBodyPattern})\\s*(?:元|円|${currencyCodePattern})?\\s*(?:减|減|-)\\s*(?<amount>${priceNumberBodyPattern})`, 'gi')))
        .forEach((match) => {
            pushRule({
                type: 'amount_off',
                originalLabel: match[0],
                rawRuleText: match[0],
                minSpend: toOptionalPriceNumber(match.groups && match.groups.threshold),
                discountAmount: toOptionalPriceNumber(match.groups && match.groups.amount)
            });
        });

    Array.from(normalized.matchAll(new RegExp(`(?<qty>\\d+)\\s*(?:pcs?|pieces?|items?|orders?)?\\s*for\\s*(?<currency>${currencyCodePattern}|${currencySymbolPattern})?\\s*(?<price>${priceNumberBodyPattern})`, 'gi')))
        .forEach((match) => {
            const rawPriceText = `${match.groups && match.groups.currency ? match.groups.currency : ''}${match.groups && match.groups.price ? match.groups.price : ''}`;
            pushRule({
                type: 'bundle_price',
                originalLabel: match[0],
                rawRuleText: match[0],
                minQuantity: parsePositiveInteger(match.groups && match.groups.qty),
                originalPriceText: rawPriceText,
                originalPrice: toOptionalPriceNumber(rawPriceText)
            });
        });

    Array.from(normalized.matchAll(new RegExp(`(?<prefix>任[选選]|任意|多买|多買|优惠|優惠|特价|特價|只要)?\\s*(?<qty>[一二两兩三四五六七八九十\\d]+)\\s*(?<unit>件|份|个|個|杯|串|本|pcs?|pieces?)\\s*(?<middle>任[选選]|优惠|優惠|特价|特價|只要|共|合计|合計|for|=|:|：)?\\s*(?<price>${priceNumberBodyPattern})\\s*(?<currency>元|円|日元|RMB|CNY|USD|美元)?`, 'gi')))
        .forEach((match) => {
            const segment = match[0];
            if (!/(任|多买|多買|优惠|優惠|特价|特價|只要|共|合计|合計|for|=|:|：)/i.test(segment)) {
                return;
            }
            const rawPriceText = `${match.groups && match.groups.price ? match.groups.price : ''}${match.groups && match.groups.currency ? match.groups.currency : ''}`;
            pushRule({
                type: 'bundle_price',
                originalLabel: segment,
                rawRuleText: segment,
                minQuantity: parsePositiveInteger(match.groups && match.groups.qty),
                originalPriceText: rawPriceText,
                originalPrice: toOptionalPriceNumber(match.groups && match.groups.price)
            });
        });

    if (!rules.length && discountKeywordPattern.test(normalized)) {
        pushRule({
            type: 'raw',
            originalLabel: normalized.slice(0, 120),
            rawRuleText: normalized.slice(0, 240)
        });
    }

    return rules;
}

function inferRuleSignals(item, exchangeRate, originalCurrency = 'unknown') {
    const candidateText = getCandidateTextParts(item).join(' | ');
    const inferredTiers = extractTiersFromText(candidateText, exchangeRate);
    const inferredAddOns = extractAddOnsFromText(candidateText, exchangeRate);
    const inferredDiscountRules = extractDiscountRulesFromText(candidateText, exchangeRate, originalCurrency);
    const comboCandidate = comboKeywordPattern.test(candidateText);
    const addOnCandidate = addOnKeywordPattern.test(candidateText);
    const bonusCandidate = bonusKeywordPattern.test(candidateText);
    const discountCandidate = discountKeywordPattern.test(candidateText);

    return {
        candidateText,
        inferredTiers,
        inferredAddOns,
        inferredDiscountRules,
        comboCandidate,
        addOnCandidate,
        bonusCandidate,
        discountCandidate
    };
}

module.exports = {
    getCandidateTextParts,
    extractTiersFromText,
    extractAddOnsFromText,
    extractDiscountRulesFromText,
    inferRuleSignals
};
