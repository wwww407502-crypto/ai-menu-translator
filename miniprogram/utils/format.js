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

function inferItemType(item, tiers, bundleItems) {
  const itemType = toText(item && item.itemType).toLowerCase();
  if (itemType === 'single' || itemType === 'tiered' || itemType === 'bundle') {
    return itemType;
  }
  if (bundleItems.length) return 'bundle';
  if (tiers.length) return 'tiered';
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
    const itemType = inferItemType(item, tiers, bundleItems);
    const displayPrices = inferDisplayPrices(item, tiers);
    const hasStructuredPromotion = Boolean(
      itemType !== 'single' || tiers.length || bundleItems.length || addOns.length || bonusItems.length
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
      promotionSummary: toText(item && item.promotionSummary),
      rawPromotionText: toText(item && item.rawPromotionText),
      parseMode,
      hasStructuredPromotion
    };
  });
}

function resolveCartUnitPrice(item, key) {
  const selectedOption = item.selectedOption || item.selectedTier || {};
  const directSelected = toOptionalNumber(selectedOption[key]);
  const addOnDeltaKey = key === 'originalPrice' ? 'originalPriceDelta' : 'convertedPriceDelta';
  const selectedAddOns = Array.isArray(item.selectedAddOns) ? item.selectedAddOns : [];
  const addOnTotal = selectedAddOns.reduce(
    (sum, addOn) => sum + toFiniteNumber(addOn && addOn[addOnDeltaKey], 0),
    0
  );

  if (directSelected !== null) {
    return directSelected + addOnTotal;
  }

  const displayValue = toOptionalNumber(item[`display${key[0].toUpperCase()}${key.slice(1)}`]);
  if (displayValue !== null) {
    return displayValue + addOnTotal;
  }

  return toFiniteNumber(item[key], 0) + addOnTotal;
}

function getCartItemTotals(orderItem) {
  const quantity = toFiniteNumber(orderItem && orderItem.quantity, 0);
  const item = (orderItem && orderItem.menuItem) || {};
  const unitOriginal = resolveCartUnitPrice(item, 'originalPrice');
  const unitConverted = resolveCartUnitPrice(item, 'convertedPrice');

  return {
    quantity,
    unitOriginal,
    unitConverted,
    totalOriginal: unitOriginal * quantity,
    totalConverted: unitConverted * quantity
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
