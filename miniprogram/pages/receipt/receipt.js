const { formatMoney, getCartTotals, getCurrencyFractionDigits } = require('../../utils/format');
const { getSystemCopy, getReceiptSourceCopy } = require('../../utils/i18n');
const store = require('../../utils/store');

function getTierLabel(tier = {}) {
  return tier.translatedLabel || tier.label || tier.originalLabel || '';
}

function getOriginalTierLabel(tier = {}) {
  return tier.originalLabel || tier.label || tier.translatedLabel || '';
}

function getAddOnLabel(addOn = {}) {
  return addOn.translatedLabel || addOn.label || addOn.originalLabel || '';
}

function getOriginalAddOnLabel(addOn = {}) {
  return addOn.originalLabel || addOn.label || addOn.translatedLabel || '';
}

function getBonusLabel(bonusItem = {}) {
  return bonusItem.translatedLabel || bonusItem.label || bonusItem.originalLabel || '';
}

function getDiscountRuleLabel(rule = {}) {
  return rule.translatedLabel || rule.label || rule.originalLabel || rule.rawRuleText || '';
}

function getOriginalBonusLabel(bonusItem = {}) {
  return bonusItem.originalLabel || bonusItem.label || bonusItem.translatedLabel || '';
}

function getOriginalDiscountRuleLabel(rule = {}) {
  return rule.originalLabel || rule.rawRuleText || rule.label || rule.translatedLabel || '';
}

function getBundleItemLabel(bundleItem = {}) {
  const name = bundleItem.translatedName || bundleItem.originalName || '';
  const quantity = Number(bundleItem.quantity || 0);
  const note = bundleItem.note || '';
  const quantityText = quantity > 0 ? ` x${quantity}` : '';
  return `${name}${quantityText}${note ? ` · ${note}` : ''}`;
}

function getOriginalBundleItemLabel(bundleItem = {}) {
  const name = bundleItem.originalName || bundleItem.translatedName || '';
  const quantity = Number(bundleItem.quantity || 0);
  const note = bundleItem.note || '';
  const quantityText = quantity > 0 ? ` x${quantity}` : '';
  return `${name}${quantityText}${note ? ` · ${note}` : ''}`;
}

function formatSourceOrderCount(quantity, sourceLanguage) {
  const normalizedQuantity = Number(quantity || 0);
  if (sourceLanguage === 'ja') return `${normalizedQuantity}点`;
  if (sourceLanguage === 'ko') return `${normalizedQuantity}개`;
  if (sourceLanguage === 'zh-CN' || sourceLanguage === 'zh-TW') return `${normalizedQuantity}份`;
  return `${normalizedQuantity} ${normalizedQuantity === 1 ? 'order' : 'orders'}`;
}

function buildWaiterSummary(quantity, selectedTierLabel, sourceLanguage) {
  const orderCountText = formatSourceOrderCount(quantity, sourceLanguage);
  if (!selectedTierLabel) {
    return orderCountText;
  }
  if (sourceLanguage === 'ja' || sourceLanguage === 'zh-CN' || sourceLanguage === 'zh-TW') {
    return `${orderCountText}（${selectedTierLabel}）`;
  }
  return `${orderCountText} (${selectedTierLabel})`;
}

function buildReceiptItems(cart, sourceLanguage) {
  return (cart || []).map((orderItem) => {
    const menuItem = orderItem.menuItem || {};
    const detailLines = [];
    const selectedTierLabel = getOriginalTierLabel(menuItem.selectedOption || menuItem.selectedTier || {});
    const selectedAddOns = Array.isArray(menuItem.selectedAddOns) ? menuItem.selectedAddOns : [];
    const quantity = Number(orderItem.quantity || 0);

    if ((menuItem.bundleItems || []).length) {
      detailLines.push((menuItem.bundleItems || []).map(getOriginalBundleItemLabel).join(' / '));
    }

    if (selectedAddOns.length) {
      detailLines.push(selectedAddOns.map(getOriginalAddOnLabel).join(' / '));
    }

    if ((menuItem.bonusItems || []).length) {
      detailLines.push((menuItem.bonusItems || []).map(getOriginalBonusLabel).join(' / '));
    }

    if ((menuItem.discountRules || []).length) {
      detailLines.push((menuItem.discountRules || []).map(getOriginalDiscountRuleLabel).join(' / '));
    }

    if (menuItem.rawPromotionText && menuItem.parseMode !== 'structured') {
      detailLines.push(menuItem.rawPromotionText);
    }

    return {
      id: orderItem.id,
      title: menuItem.originalName || menuItem.translatedName || '',
      subtitle: '',
      quantity,
      waiterSummary: buildWaiterSummary(quantity, selectedTierLabel, sourceLanguage),
      detailLines,
      detailOrderText: `${orderItem.quantity} x ${menuItem.translatedName || menuItem.originalName || ''}${getTierLabel(menuItem.selectedOption || menuItem.selectedTier || {}) ? ` (${getTierLabel(menuItem.selectedOption || menuItem.selectedTier || {})})` : ''}${(menuItem.discountRules || []).length ? ` - ${(menuItem.discountRules || []).map(getDiscountRuleLabel).join(' / ')}` : ''}`
    };
  });
}

function buildReceiptCode(cart = []) {
  const totalQuantity = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const stamp = Date.now().toString().slice(-8);
  return `AM-${totalQuantity}-${stamp}`;
}

function buildPrintedAt() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ];
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ];
  return `${parts.join('.')} ${time.join(':')}`;
}

Page({
  data: {
    cart: [],
    originalCurrency: 'USD',
    originalCurrencyMeta: { code: 'USD', fractionDigits: 2 },
    targetCurrency: 'CNY',
    targetCurrencyMeta: { code: 'CNY', fractionDigits: 2 },
    totalOriginalText: '0',
    totalConvertedText: '0.00',
    itemCountLabel: '0 items',
    totalQuantity: 0,
    receiptItems: [],
    titleText: '',
    thanksText: '',
    detailLabelText: '',
    totalLabelText: '',
    detailHintText: '',
    originalAmountText: '',
    convertedAmountText: '',
    sourceLanguage: 'en',
    quantityUnitText: '',
    receiptCode: '',
    printedAt: ''
  },

  onShow() {
    const state = store.getState();
    if (!state.cart.length) {
      wx.navigateBack();
      return;
    }

    const cart = state.cart.map((orderItem) => ({ ...orderItem }));
    const totals = getCartTotals(cart);
    const totalQuantity = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const sourceLanguage = state.sourceLanguage || 'en';
    const systemCopy = getSystemCopy(state.systemLanguage);
    const sourceCopy = getReceiptSourceCopy(sourceLanguage);
    const receiptItems = buildReceiptItems(cart, sourceLanguage);
    const quantityLabel = `${totalQuantity} ${totalQuantity === 1 ? systemCopy.itemSingular : systemCopy.itemPlural}`;
    const originalDigits = getCurrencyFractionDigits(state.originalCurrency, state.originalCurrencyMeta);

    this.setData({
      cart,
      originalCurrency: state.originalCurrency,
      originalCurrencyMeta: state.originalCurrencyMeta || { code: state.originalCurrency, fractionDigits: 2 },
      targetCurrency: state.targetCurrency,
      targetCurrencyMeta: state.targetCurrencyMeta || { code: state.targetCurrency, fractionDigits: 2 },
      totalOriginalText: formatMoney(totals.original, originalDigits),
      totalConvertedText: formatMoney(totals.converted, 2),
      itemCountLabel: quantityLabel,
      totalQuantity,
      receiptItems,
      titleText: sourceCopy.title,
      thanksText: sourceCopy.thanks,
      detailLabelText: systemCopy.orderText,
      totalLabelText: systemCopy.total,
      detailHintText: systemCopy.cartSummaryHint,
      originalAmountText: `${state.originalCurrency} ${formatMoney(totals.original, originalDigits)}`,
      convertedAmountText: `${state.targetCurrency} ${formatMoney(totals.converted, 2)}`,
      sourceLanguage,
      quantityUnitText: systemCopy.itemsUnit,
      receiptCode: buildReceiptCode(cart),
      printedAt: buildPrintedAt()
    });

    wx.setNavigationBarTitle({ title: systemCopy.receiptTitle });
  },

  backToMenu() {
    wx.navigateBack();
  }
});
