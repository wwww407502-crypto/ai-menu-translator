const {
    toTrimmedString,
    toOptionalString,
    toOptionalNumber,
    toOptionalPriceNumber,
    roundPrice,
    convertPrice
} = require('./utils');
const { resolvePriceValue, shouldPreferInferredPrices } = require('./price');
const { normalizeDiscountRule } = require('./discount');
const { inferRuleSignals } = require('./extraction');
const {
    supportedItemTypes,
    supportedParseModes
} = require('../config');

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

function inferItemType(item, tiers, bundleItems, ruleSignals = {}, addOns = [], bonusItems = []) {
    const itemType = toTrimmedString(item && item.itemType).toLowerCase();
    if (itemType === 'bundle') {
        return 'bundle';
    }
    if (bundleItems.length) {
        return 'bundle';
    }
    if (
        ruleSignals.comboCandidate
        && (
            !itemType
            || itemType === 'single'
            || ((itemType === 'tiered') && (addOns.length || bonusItems.length))
        )
    ) {
        return 'bundle';
    }
    if (supportedItemTypes.has(itemType)) {
        return itemType;
    }
    if (tiers.length > 1) {
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
    const { getCandidateTextParts } = require('./extraction');
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
    const explicitDiscountRules = Array.isArray(item && item.discountRules)
        ? item.discountRules.map((rule, ruleIndex) => normalizeDiscountRule(rule, ruleIndex, exchangeRate, originalCurrency, candidateText)).filter(Boolean)
        : [];

    const ruleSignals = inferRuleSignals(item, exchangeRate, originalCurrency);
    const mergedTiers = shouldPreferInferredPrices(tiers, ruleSignals.inferredTiers, originalCurrency)
        ? ruleSignals.inferredTiers
        : (tiers.length ? tiers : ruleSignals.inferredTiers);
    const mergedAddOns = shouldPreferInferredPrices(addOns, ruleSignals.inferredAddOns, originalCurrency)
        ? ruleSignals.inferredAddOns
        : (addOns.length ? addOns : ruleSignals.inferredAddOns);
    const mergedDiscountRules = explicitDiscountRules.length
        ? explicitDiscountRules
        : ruleSignals.inferredDiscountRules;
    let itemType = inferItemType(
        {
            ...item,
            itemType: ruleSignals.comboCandidate && !toTrimmedString(item && item.itemType) ? 'bundle' : item && item.itemType
        },
        mergedTiers,
        bundleItems,
        ruleSignals,
        mergedAddOns,
        bonusItems
    );
    const hasActionableTierSelection = mergedTiers.length > 1;
    const hasStructuredSelection = hasActionableTierSelection || mergedAddOns.length > 0;
    const hasStructuredContent = bundleItems.length > 0 || bonusItems.length > 0;
    const hasDiscountRules = mergedDiscountRules.length > 0;

    if (itemType === 'tiered' && !hasActionableTierSelection) {
        itemType = 'single';
    }
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
        (ruleSignals.inferredTiers.length > 1 || ruleSignals.inferredAddOns.length || ruleSignals.inferredDiscountRules.length || ruleSignals.comboCandidate || ruleSignals.bonusCandidate)
            ? ruleSignals.candidateText
            : null
    );
    const hasStructuredPromotion = itemType !== 'single' || hasStructuredSelection || hasStructuredContent || hasDiscountRules;
    let parseMode = inferParseMode(item, hasStructuredPromotion);

    if (
        parseMode === 'basic' &&
        (
            ruleSignals.inferredTiers.length > 1 ||
            (ruleSignals.comboCandidate && !bundleItems.length) ||
            (ruleSignals.addOnCandidate && !mergedAddOns.length) ||
            ruleSignals.bonusCandidate ||
            (ruleSignals.discountCandidate && !mergedDiscountRules.length)
        )
    ) {
        parseMode = 'partial';
    }

    const normalizedPromotionSummary = toOptionalString(item && item.promotionSummary)
        || (itemType === 'tiered' && hasActionableTierSelection ? 'Contains multi-tier pricing' : null)
        || (itemType === 'bundle' && ruleSignals.comboCandidate ? 'Contains combo or mixed set pricing' : null)
        || (hasDiscountRules ? 'Contains quantity or discount promotion' : null);

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
        tiers: (require('./utils').ensureUniqueById)(mergedTiers),
        bundleItems,
        addOns: (require('./utils').ensureUniqueById)(mergedAddOns),
        bonusItems,
        discountRules: (require('./utils').ensureUniqueById)(mergedDiscountRules),
        promotionSummary: normalizedPromotionSummary,
        rawPromotionText: inferredRawPromotionText,
        parseMode,
        hasStructuredPromotion
    };
}

module.exports = {
    normalizeTier,
    normalizeBundleItem,
    normalizeAddOn,
    normalizeBonusItem,
    inferItemType,
    inferParseMode,
    normalizeParsedItem
};
