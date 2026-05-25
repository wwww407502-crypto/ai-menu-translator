const { CURRENCY_METADATA } = require('./currency-data');

function normalizeLanguageTag(tag) {
  if (!tag) return 'zh-CN';
  const normalized = String(tag).replace('_', '-');
  if (normalized === 'zh-Hans' || normalized === 'zh-CN') return 'zh-CN';
  if (normalized === 'zh-Hant' || normalized === 'zh-TW') return 'zh-TW';
  return normalized;
}

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toOptionalNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function formatMoney(value, digits = 2) {
  const number = toFiniteNumber(value, 0);
  return number.toFixed(digits);
}

function getCurrencyMeta(currency, overrideMeta) {
  if (overrideMeta && Number.isFinite(Number(overrideMeta.fractionDigits))) {
    return {
      fractionDigits: Number(overrideMeta.fractionDigits)
    };
  }

  const normalized = typeof currency === 'string' ? currency.toUpperCase() : '';
  return CURRENCY_METADATA[normalized] || { fractionDigits: 2 };
}

function getCurrencyFractionDigits(currency, overrideMeta) {
  return getCurrencyMeta(currency, overrideMeta).fractionDigits;
}

function createMenuItemId(item, index) {
  const base = [
    item.category || 'Other',
    item.originalName || '',
    item.translatedName || '',
    item.itemType || '',
    item.originalPrice || 0,
    item.rawPromotionText || '',
    index
  ].join('|');
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  return `item-${index}-${Math.abs(hash)}`;
}

function normalizeTier(tier, index) {
  const originalPrice = toOptionalNumber(tier && tier.originalPrice);
  const convertedPrice = toOptionalNumber(tier && tier.convertedPrice);

  if (originalPrice === null && convertedPrice === null) {
    return null;
  }

  return {
    id: toText(tier && tier.id, `tier-${index + 1}`),
    label: toText(tier && tier.label),
    originalLabel: toText(tier && tier.originalLabel, toText(tier && tier.label)),
    translatedLabel: toText(tier && tier.translatedLabel, toText(tier && tier.label)),
    quantity: toOptionalNumber(tier && tier.quantity),
    originalPrice: toFiniteNumber(originalPrice, 0),
    convertedPrice: toFiniteNumber(convertedPrice, 0),
    note: toText(tier && tier.note)
  };
}

function normalizeBundleItem(bundleItem) {
  const originalName = toText(bundleItem && bundleItem.originalName);
  const translatedName = toText(bundleItem && bundleItem.translatedName, originalName);

  if (!originalName && !translatedName) {
    return null;
  }

  return {
    originalName,
    translatedName,
    quantity: toOptionalNumber(bundleItem && bundleItem.quantity),
    note: toText(bundleItem && bundleItem.note)
  };
}

function normalizeAddOn(addOn, index) {
  const originalLabel = toText(addOn && addOn.originalLabel, toText(addOn && addOn.label));
  const translatedLabel = toText(addOn && addOn.translatedLabel, toText(addOn && addOn.label));
  const originalPriceDelta = toOptionalNumber(addOn && (addOn.originalPriceDelta ?? addOn.originalPrice));
  const convertedPriceDelta = toOptionalNumber(addOn && (addOn.convertedPriceDelta ?? addOn.convertedPrice));

  if (!originalLabel && !translatedLabel && originalPriceDelta === null && convertedPriceDelta === null) {
    return null;
  }

  return {
    id: toText(addOn && addOn.id, `addon-${index + 1}`),
    originalLabel,
    translatedLabel,
    originalPriceDelta: toFiniteNumber(originalPriceDelta, 0),
    convertedPriceDelta: toFiniteNumber(convertedPriceDelta, 0),
    required: Boolean(addOn && addOn.required),
    note: toText(addOn && addOn.note)
  };
}

function normalizeBonusItem(bonusItem) {
  const originalLabel = toText(
    bonusItem && (bonusItem.originalLabel || bonusItem.originalName || bonusItem.label)
  );
  const translatedLabel = toText(
    bonusItem && (bonusItem.translatedLabel || bonusItem.translatedName || bonusItem.label),
    originalLabel
  );

  if (!originalLabel && !translatedLabel) {
    return null;
  }

  return {
    originalLabel,
    translatedLabel,
    quantity: toOptionalNumber(bonusItem && bonusItem.quantity),
    note: toText(bonusItem && bonusItem.note)
  };
}

function normalizeDiscountRule(rule, index) {
  const originalLabel = toText(rule && (rule.originalLabel || rule.label || rule.rawRuleText));
  const translatedLabel = toText(rule && (rule.translatedLabel || rule.label), originalLabel);
  const type = toText(rule && (rule.type || rule.ruleType), 'raw').replace(/-/g, '_');

  if (!originalLabel && !translatedLabel && !toText(rule && rule.rawRuleText)) {
    return null;
  }

  return {
    id: toText(rule && rule.id, `discount-${index + 1}`),
    type,
    originalLabel,
    translatedLabel,
    rawRuleText: toText(rule && rule.rawRuleText),
    minQuantity: toOptionalNumber(rule && rule.minQuantity),
    paidQuantity: toOptionalNumber(rule && rule.paidQuantity),
    freeQuantity: toOptionalNumber(rule && rule.freeQuantity),
    appliesToQuantity: toOptionalNumber(rule && rule.appliesToQuantity),
    minSpend: toOptionalNumber(rule && rule.minSpend),
    originalPriceText: toText(rule && rule.originalPriceText),
    originalPrice: toOptionalNumber(rule && rule.originalPrice),
    convertedPrice: toOptionalNumber(rule && rule.convertedPrice),
    discountAmountText: toText(rule && rule.discountAmountText),
    discountAmount: toOptionalNumber(rule && rule.discountAmount),
    convertedDiscountAmount: toOptionalNumber(rule && rule.convertedDiscountAmount),
    discountPercent: toOptionalNumber(rule && rule.discountPercent),
    note: toText(rule && rule.note)
  };
}

function inferItemType(item, tiers, bundleItems) {
  const itemType = toText(item && item.itemType).toLowerCase();
  if (itemType === 'bundle') return 'bundle';
  if (bundleItems.length) return 'bundle';
  if (itemType === 'tiered' && tiers.length > 1) return 'tiered';
  if (itemType === 'single') return 'single';
  if (tiers.length > 1) return 'tiered';
  return 'single';
}

function inferDisplayPrices(item, tiers) {
  const displayOriginalPrice = toOptionalNumber(item && (item.displayOriginalPrice ?? item.originalPrice));
  const displayConvertedPrice = toOptionalNumber(item && (item.displayConvertedPrice ?? item.convertedPrice));

  if (displayOriginalPrice !== null || displayConvertedPrice !== null) {
    return {
      originalPrice: toFiniteNumber(displayOriginalPrice, 0),
      convertedPrice: toFiniteNumber(displayConvertedPrice, 0)
    };
  }

  const firstTier = tiers[0] || {};
  return {
    originalPrice: toFiniteNumber(firstTier.originalPrice, 0),
    convertedPrice: toFiniteNumber(firstTier.convertedPrice, 0)
  };
}

function withMenuItemIds(items) {
  return (items || []).map((item, index) => {
    const tiers = Array.isArray(item && item.tiers)
      ? item.tiers.map((tier, tierIndex) => normalizeTier(tier, tierIndex)).filter(Boolean)
      : [];
    const bundleItems = Array.isArray(item && item.bundleItems)
      ? item.bundleItems.map((bundleItem) => normalizeBundleItem(bundleItem)).filter(Boolean)
      : [];
    const addOns = Array.isArray(item && item.addOns)
      ? item.addOns.map((addOn, addOnIndex) => normalizeAddOn(addOn, addOnIndex)).filter(Boolean)
      : [];
    const bonusItems = Array.isArray(item && item.bonusItems)
      ? item.bonusItems.map((bonusItem) => normalizeBonusItem(bonusItem)).filter(Boolean)
      : [];
    const discountRules = Array.isArray(item && item.discountRules)
      ? item.discountRules.map((rule, ruleIndex) => normalizeDiscountRule(rule, ruleIndex)).filter(Boolean)
      : [];
    const itemType = inferItemType(item, tiers, bundleItems);
    const displayPrices = inferDisplayPrices(item, tiers);
    const hasStructuredPromotion = Boolean(
      itemType !== 'single' || tiers.length || bundleItems.length || addOns.length || bonusItems.length || discountRules.length
    );
    const parseMode = toText(item && item.parseMode, hasStructuredPromotion ? 'structured' : 'basic');

    return {
      ...item,
      id: item.id || createMenuItemId(item, index),
      category: toText(item && item.category, '其他'),
      originalName: toText(item && item.originalName, `Item ${index + 1}`),
      translatedName: toText(item && item.translatedName, toText(item && item.originalName, `Item ${index + 1}`)),
      itemType,
      pricingType: toText(item && item.pricingType, itemType),
      originalPrice: displayPrices.originalPrice,
      convertedPrice: displayPrices.convertedPrice,
      displayOriginalPrice: displayPrices.originalPrice,
      displayConvertedPrice: displayPrices.convertedPrice,
      tiers,
      bundleItems,
      addOns,
      bonusItems,
      discountRules,
      promotionSummary: toText(item && item.promotionSummary),
      rawPromotionText: toText(item && item.rawPromotionText),
      parseMode,
      hasStructuredPromotion
    };
  });
}

function resolveCartUnitPriceParts(item, key) {
  const selectedOption = item.selectedOption || item.selectedTier || {};
  const directSelected = toOptionalNumber(selectedOption[key]);
  const addOnDeltaKey = key === 'originalPrice' ? 'originalPriceDelta' : 'convertedPriceDelta';
  const selectedAddOns = Array.isArray(item.selectedAddOns) ? item.selectedAddOns : [];
  const addOnTotal = selectedAddOns.reduce(
    (sum, addOn) => sum + toFiniteNumber(addOn && addOn[addOnDeltaKey], 0),
    0
  );
  let basePrice = null;

  if (directSelected !== null) {
    basePrice = directSelected;
  } else {
    const displayValue = toOptionalNumber(item[`display${key[0].toUpperCase()}${key.slice(1)}`]);
    basePrice = displayValue !== null ? displayValue : toFiniteNumber(item[key], 0);
  }

  return {
    basePrice: toFiniteNumber(basePrice, 0),
    addOnTotal,
    unitPrice: toFiniteNumber(basePrice, 0) + addOnTotal,
    hasSelectedOption: Boolean(selectedOption && selectedOption.id)
  };
}

function applyDiscountRulesToSubtotal(baseUnitPrice, quantity, rules = [], key = 'originalPrice') {
  const safeQuantity = Math.max(0, Math.floor(toFiniteNumber(quantity, 0)));
  const unitPrice = toFiniteNumber(baseUnitPrice, 0);
  const baseSubtotal = unitPrice * safeQuantity;
  if (!safeQuantity || !unitPrice || !rules.length) {
    return baseSubtotal;
  }

  const fixedPriceKey = key === 'originalPrice' ? 'originalPrice' : 'convertedPrice';
  const discountAmountKey = key === 'originalPrice' ? 'discountAmount' : 'convertedDiscountAmount';
  const candidates = [baseSubtotal];

  rules.forEach((rule) => {
    const type = toText(rule && rule.type).replace(/-/g, '_');
    const minQuantity = Math.max(0, Math.floor(toFiniteNumber(rule && rule.minQuantity, 0)));
    const paidQuantity = Math.max(0, Math.floor(toFiniteNumber(rule && rule.paidQuantity, 0)));
    const freeQuantity = Math.max(0, Math.floor(toFiniteNumber(rule && rule.freeQuantity, 0)));
    const appliesToQuantity = Math.max(0, Math.floor(toFiniteNumber(rule && rule.appliesToQuantity, 0)));
    const discountPercent = Math.min(100, Math.max(0, toFiniteNumber(rule && rule.discountPercent, 0)));
    const fixedPrice = toOptionalNumber(rule && rule[fixedPriceKey]);
    const discountAmount = toOptionalNumber(rule && rule[discountAmountKey]);

    if (type === 'bundle_price' && minQuantity > 1 && fixedPrice !== null) {
      const groupCount = Math.floor(safeQuantity / minQuantity);
      const remainder = safeQuantity % minQuantity;
      candidates.push(groupCount * fixedPrice + remainder * unitPrice);
      return;
    }

    if (type === 'buy_x_get_y' && paidQuantity > 0 && freeQuantity > 0) {
      const cycleQuantity = paidQuantity + freeQuantity;
      const cycleCount = Math.floor(safeQuantity / cycleQuantity);
      const remainder = safeQuantity % cycleQuantity;
      const paidUnits = cycleCount * paidQuantity + Math.min(remainder, paidQuantity);
      candidates.push(paidUnits * unitPrice);
      return;
    }

    if (type === 'nth_item_discount' && appliesToQuantity > 1 && discountPercent > 0) {
      const discountedUnits = Math.floor(safeQuantity / appliesToQuantity);
      candidates.push(baseSubtotal - discountedUnits * unitPrice * (discountPercent / 100));
      return;
    }

    if (type === 'percentage_discount' && discountPercent > 0 && (!minQuantity || safeQuantity >= minQuantity)) {
      candidates.push(baseSubtotal * (1 - discountPercent / 100));
      return;
    }

    if (type === 'amount_off' && discountAmount !== null && discountAmount > 0) {
      const discountTimes = minQuantity > 0 ? Math.floor(safeQuantity / minQuantity) : 1;
      candidates.push(baseSubtotal - discountTimes * discountAmount);
    }
  });

  return Math.max(0, Math.min(...candidates));
}

function getCartItemTotals(orderItem) {
  const quantity = toFiniteNumber(orderItem && orderItem.quantity, 0);
  const item = (orderItem && orderItem.menuItem) || {};
  const originalParts = resolveCartUnitPriceParts(item, 'originalPrice');
  const convertedParts = resolveCartUnitPriceParts(item, 'convertedPrice');
  const discountRules = originalParts.hasSelectedOption ? [] : (item.discountRules || []);
  const discountedOriginalBase = applyDiscountRulesToSubtotal(originalParts.basePrice, quantity, discountRules, 'originalPrice');
  const discountedConvertedBase = applyDiscountRulesToSubtotal(convertedParts.basePrice, quantity, discountRules, 'convertedPrice');
  const totalOriginal = discountedOriginalBase + originalParts.addOnTotal * quantity;
  const totalConverted = discountedConvertedBase + convertedParts.addOnTotal * quantity;

  return {
    quantity,
    unitOriginal: quantity ? totalOriginal / quantity : originalParts.unitPrice,
    unitConverted: quantity ? totalConverted / quantity : convertedParts.unitPrice,
    totalOriginal,
    totalConverted,
    discountApplied: discountRules.length > 0 && totalOriginal < originalParts.unitPrice * quantity
  };
}

function getCartTotals(cart) {
  return (cart || []).reduce(
    (totals, orderItem) => {
      const itemTotals = getCartItemTotals(orderItem);
      totals.original += itemTotals.totalOriginal;
      totals.converted += itemTotals.totalConverted;
      return totals;
    },
    { original: 0, converted: 0 }
  );
}

function buildOrderText(cart, nameField = 'originalName') {
  return (cart || [])
    .map((orderItem) => {
      const menuItem = orderItem.menuItem || {};
      const displayName = menuItem[nameField] || menuItem.translatedName || menuItem.originalName || '';
      const selectedOption = menuItem.selectedOption || menuItem.selectedTier || {};
      const optionLabel =
        selectedOption.translatedLabel ||
        selectedOption.label ||
        selectedOption.originalLabel ||
        orderItem.optionLabel ||
        '';
      const addOnLabels = (Array.isArray(menuItem.selectedAddOns) ? menuItem.selectedAddOns : [])
        .map((addOn) => addOn.translatedLabel || addOn.label || addOn.originalLabel || '')
        .filter(Boolean);
      const detailParts = [];

      if (optionLabel) {
        detailParts.push(optionLabel);
      }

      if (addOnLabels.length) {
        detailParts.push(`+ ${addOnLabels.join(' / ')}`);
      }

      return `${orderItem.quantity} x ${displayName}${detailParts.length ? ` (${detailParts.join('; ')})` : ''}`;
    })
    .join('\n');
}

module.exports = {
  normalizeLanguageTag,
  formatMoney,
  getCurrencyMeta,
  getCurrencyFractionDigits,
  withMenuItemIds,
  getCartItemTotals,
  getCartTotals,
  buildOrderText
};
