const { toTrimmedString } = require('./utils');

function normalizeNameForMatch(name) {
    return toTrimmedString(name)
        .toLowerCase()
        .replace(/[\s\-_/,.\u3000]+/g, ' ')
        .replace(/[\(\)\[\]（）【】「」『』]/g, '')
        .trim();
}

function nameSimilarity(a, b) {
    const na = normalizeNameForMatch(a);
    const nb = normalizeNameForMatch(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) return 0.9;

    const shorter = na.length < nb.length ? na : nb;
    const longer = na.length < nb.length ? nb : na;
    const maxDist = Math.floor(shorter.length / 3);
    if (maxDist === 0) return shorter === longer ? 1 : 0;

    let mismatches = 0;
    const minLen = Math.min(na.length, nb.length);
    for (let i = 0; i < minLen; i++) {
        if (na[i] !== nb[i]) mismatches++;
    }
    mismatches += Math.abs(na.length - nb.length);
    if (mismatches <= maxDist) return 0.85;
    return 0;
}

function mergeTiers(existingTiers, incomingTiers) {
    const seen = new Set(existingTiers.map(t => toTrimmedString(t && t.id) || ''));
    const merged = [...existingTiers];
    for (const tier of incomingTiers) {
        const id = toTrimmedString(tier && tier.id);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(tier);
    }
    return merged;
}

function mergeAddOns(existing, incoming) {
    const seen = new Set(existing.map(a => toTrimmedString(a && a.originalLabel) || ''));
    const merged = [...existing];
    for (const addOn of incoming) {
        const key = toTrimmedString(addOn && addOn.originalLabel);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(addOn);
    }
    return merged;
}

function mergeDiscountRules(existing, incoming) {
    const seen = new Set(existing.map(r => toTrimmedString(r && r.id) || ''));
    const merged = [...existing];
    for (const rule of incoming) {
        const id = toTrimmedString(rule && rule.id);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(rule);
    }
    return merged;
}

function mergeBundleItems(existing, incoming) {
    const seen = new Set(existing.map(b => normalizeNameForMatch(b && b.originalName)));
    const merged = [...existing];
    for (const item of incoming) {
        const key = normalizeNameForMatch(item && item.originalName);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
    }
    return merged;
}

function mergeMenuItems(allItemsByPage) {
    if (!allItemsByPage.length) return [];
    if (allItemsByPage.length === 1) return allItemsByPage[0];

    const merged = [];
    const mergedNames = new Map();
    const matchThreshold = 0.8;

    for (const pageItems of allItemsByPage) {
        for (const item of pageItems) {
            const itemName = toTrimmedString(item && item.originalName);
            if (!itemName) continue;

            const normalizedItemName = normalizeNameForMatch(itemName);
            let bestMatch = null;
            let bestScore = 0;

            for (const [existingName, existingIndex] of mergedNames.entries()) {
                const score = nameSimilarity(itemName, existingName);
                if (score > bestScore && score >= matchThreshold) {
                    bestScore = score;
                    bestMatch = existingIndex;
                }
            }

            if (bestMatch !== null) {
                const existing = merged[bestMatch];
                existing.tiers = mergeTiers(existing.tiers || [], item.tiers || []);
                existing.addOns = mergeAddOns(existing.addOns || [], item.addOns || []);
                existing.discountRules = mergeDiscountRules(existing.discountRules || [], item.discountRules || []);
                existing.bundleItems = mergeBundleItems(existing.bundleItems || [], item.bundleItems || []);
                if (item.parseMode === 'structured' && existing.parseMode !== 'structured') {
                    existing.parseMode = 'structured';
                }
                if (item.itemType === 'bundle' && existing.itemType === 'single') {
                    existing.itemType = 'bundle';
                    existing.pricingType = 'bundle';
                }
                if (toTrimmedString(item && item.category)) {
                    existing.category = toTrimmedString(item && item.category);
                }
                if (toTrimmedString(item && item.translatedName) && toTrimmedString(item && item.translatedName) !== existing.translatedName) {
                    existing.translatedName = toTrimmedString(item && item.translatedName);
                }
            } else {
                mergedNames.set(itemName, merged.length);
                merged.push({ ...item });
            }
        }
    }

    return merged;
}

function mergeParseWarnings(pageResults) {
    const allWarnings = [];
    for (let i = 0; i < pageResults.length; i++) {
        const result = pageResults[i];
        const prefix = `Page ${i + 1} (${result.parseStrategy}): `;
        if (result.parseWarnings && result.parseWarnings.length) {
            for (const w of result.parseWarnings) {
                allWarnings.push(prefix + w);
            }
        }
    }
    return allWarnings;
}

function mergeGlobalAddOns(pageResults) {
    const seen = new Set();
    const merged = [];
    for (const result of pageResults) {
        const addOns = result.aiResponse && result.aiResponse.globalAddOns || [];
        for (const addOn of addOns) {
            const key = toTrimmedString(addOn && addOn.originalLabel);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            merged.push(addOn);
        }
    }
    return merged;
}

function mergeGlobalDiscountRules(pageResults) {
    const seen = new Set();
    const merged = [];
    for (const result of pageResults) {
        const rules = result.aiResponse && result.aiResponse.globalDiscountRules || [];
        for (const rule of rules) {
            const id = toTrimmedString(rule && rule.id);
            if (!id || seen.has(id)) continue;
            seen.add(id);
            merged.push(rule);
        }
    }
    return merged;
}

function mergeGlobalPromotionText(pageResults) {
    return pageResults
        .map(r => toTrimmedString(r.aiResponse && r.aiResponse.globalPromotionText))
        .filter(Boolean)
        .join(' | ')
    || null;
}

function mergeMenuResults(pageResults, originalCurrency, exchangeRate) {
    if (!pageResults.length) {
        return {
            items: [],
            parseStrategy: 'degraded',
            parseWarnings: ['No pages were parsed successfully.']
        };
    }

    const allItemsByPage = pageResults.map(r => {
        const response = r.aiResponse || {};
        return Array.isArray(response.items) ? response.items : [];
    });

    const items = mergeMenuItems(allItemsByPage);
    const parseWarnings = mergeParseWarnings(pageResults);
    const bestStrategy = pageResults.some(r => r.parseStrategy === 'direct')
        ? 'direct'
        : pageResults.some(r => r.parseStrategy === 'retry')
            ? 'retry'
            : 'degraded';

    parseWarnings.push(`Merged ${allItemsByPage.length} pages → ${items.length} unique items`);

    return {
        items,
        parseStrategy: pageResults.length === 1 ? pageResults[0].parseStrategy : `multi_${bestStrategy}`,
        parseWarnings,
        globalAddOns: mergeGlobalAddOns(pageResults),
        globalDiscountRules: mergeGlobalDiscountRules(pageResults),
        globalPromotionText: mergeGlobalPromotionText(pageResults)
    };
}

module.exports = {
    mergeMenuResults,
    mergeMenuItems,
    nameSimilarity
};
