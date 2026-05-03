const { formatMoney, getCartItemTotals, getCartTotals, getCurrencyFractionDigits } = require('../../utils/format');
const { fetchExchangeRate } = require('../../utils/api');
const { getSystemCopy, getCurrencyDisplayName, getCurrencyOptionList } = require('../../utils/i18n');
const { CURRENCY_CODES } = require('../../utils/currency-data');

const app = getApp();
const CURRENCY_OPTIONS = CURRENCY_CODES;
const currencyPricePattern = new RegExp(
  `(?:[$€£¥￥₩]?\\s*\\d+(?:[.,]\\d{1,2})?|\\b(?:${CURRENCY_OPTIONS.join('|')})\\b\\s*\\d+(?:[.,]\\d{1,2})?)`,
  'gi'
);

function getTierLabel(tier = {}) {
  return tier.translatedLabel || tier.label || tier.originalLabel || '';
}

function getAddOnLabel(addOn = {}) {
  return addOn.translatedLabel || addOn.label || addOn.originalLabel || '';
}

function getBonusLabel(bonusItem = {}) {
  return bonusItem.translatedLabel || bonusItem.label || bonusItem.originalLabel || '';
}

function getBundleItemLabel(bundleItem = {}) {
  const name = bundleItem.translatedName || bundleItem.originalName || '';
  const quantity = Number(bundleItem.quantity || 0);
  const note = bundleItem.note || '';
  const quantityText = quantity > 0 ? ` x${quantity}` : '';
  return `${name}${quantityText}${note ? ` · ${note}` : ''}`;
}

function getItemTypeLabel(item, copy) {
  if (item.itemType === 'bundle') return copy.promotionBundle;
  if (item.itemType === 'tiered') return copy.promotionTiered;
  return copy.promotionSingle;
}

function getCartEntryId(itemId, selectedOptionId, selectedAddOnIds) {
  const optionKey = selectedOptionId || 'base';
  const addOnKey = (selectedAddOnIds || []).slice().sort().join('_') || 'none';
  return `order-${itemId}-${optionKey}-${addOnKey}`;
}

function countPriceLikeMatches(text = '') {
  return (String(text || '').match(currencyPricePattern) || []).length;
}

function isLikelyCatalogText(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;

  const lineCount = normalized
    .split(/\n|\/|\|/)
    .map((line) => line.trim())
    .filter(Boolean)
    .length;
  const priceCount = countPriceLikeMatches(normalized);
  const hasGlobalRuleKeyword = /(加购|追加|附加|add-?on|extra|upgrade|任选|可加|dessert add-on|shared add-on)/i.test(normalized);

  if (hasGlobalRuleKeyword && priceCount <= 2 && lineCount <= 3) {
    return false;
  }

  return priceCount >= 3 || lineCount >= 4 || normalized.length > 160;
}

function getVisibleGlobalPromotionText(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return '';
  return isLikelyCatalogText(normalized) ? '' : normalized;
}

function getCurrencyIndex(currency) {
  const index = CURRENCY_OPTIONS.indexOf(String(currency || '').toUpperCase());
  return index >= 0 ? index : 0;
}

function buildCurrencyUiState(language, originalCurrency, targetCurrency) {
  return {
    currencyOptions: getCurrencyOptionList(language, CURRENCY_OPTIONS),
    sourceCurrencyName: getCurrencyDisplayName(language, originalCurrency),
    targetCurrencyName: getCurrencyDisplayName(language, targetCurrency)
  };
}

function buildCurrencyDraftState(language, originalCurrency, targetCurrency) {
  return {
    draftOriginalCurrency: originalCurrency,
    draftTargetCurrency: targetCurrency,
    draftSourceCurrencyName: getCurrencyDisplayName(language, originalCurrency),
    draftTargetCurrencyName: getCurrencyDisplayName(language, targetCurrency),
    draftSourceCurrencyIndex: getCurrencyIndex(originalCurrency),
    draftTargetCurrencyIndex: getCurrencyIndex(targetCurrency)
  };
}

function toAmount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function repriceTier(tier, exchangeRate) {
  return {
    ...tier,
    convertedPrice: toAmount(tier.originalPrice) * exchangeRate
  };
}

function repriceAddOn(addOn, exchangeRate) {
  return {
    ...addOn,
    convertedPriceDelta: toAmount(addOn.originalPriceDelta) * exchangeRate
  };
}

function repriceMenuItem(item, exchangeRate) {
  return {
    ...item,
    convertedPrice: toAmount(item.originalPrice) * exchangeRate,
    displayConvertedPrice: toAmount(item.displayOriginalPrice ?? item.originalPrice) * exchangeRate,
    tiers: (item.tiers || []).map((tier) => repriceTier(tier, exchangeRate)),
    addOns: (item.addOns || []).map((addOn) => repriceAddOn(addOn, exchangeRate)),
    selectedOption: item.selectedOption ? repriceTier(item.selectedOption, exchangeRate) : item.selectedOption,
    selectedTier: item.selectedTier ? repriceTier(item.selectedTier, exchangeRate) : item.selectedTier,
    selectedAddOns: (item.selectedAddOns || []).map((addOn) => repriceAddOn(addOn, exchangeRate))
  };
}

function repriceCart(cart, exchangeRate) {
  return (cart || []).map((orderItem) => ({
    ...orderItem,
    menuItem: repriceMenuItem(orderItem.menuItem || {}, exchangeRate)
  }));
}

function buildMenuDisplayItem(item, quantityById, currencies, copy) {
  const originalDigits = getCurrencyFractionDigits(currencies.original, currencies.originalMeta);
  const tierRows = (item.tiers || []).map((tier) => ({
    id: tier.id,
    labelText: getTierLabel(tier),
    originalPriceText: formatMoney(tier.originalPrice, originalDigits),
    convertedPriceText: formatMoney(tier.convertedPrice, 2)
  }));
  const bundleSummaryText = (item.bundleItems || []).map(getBundleItemLabel).join(' / ');
  const addOnSummaryText = (item.addOns || [])
    .map((addOn) => {
      const priceParts = [];
      if (Number(addOn.convertedPriceDelta || 0)) {
        priceParts.push(`${currencies.target} ${formatMoney(addOn.convertedPriceDelta, 2)}`);
      }
      if (Number(addOn.originalPriceDelta || 0)) {
        priceParts.push(`${currencies.original} ${formatMoney(addOn.originalPriceDelta, originalDigits)}`);
      }
      return `${getAddOnLabel(addOn)}${priceParts.length ? ` (${priceParts.join(' / ')})` : ''}`;
    })
    .join(' / ');
  const bonusSummaryText = (item.bonusItems || []).map(getBonusLabel).join(' / ');
  const quantity = quantityById[item.id] || 0;
  const isDirectStepper = item.itemType === 'single' && !(item.addOns || []).length;

  return {
    ...item,
    quantity,
    originalPriceText: formatMoney(item.originalPrice, originalDigits),
    convertedPriceText: formatMoney(item.convertedPrice, 2),
    tierRows,
    bundleSummaryText,
    addOnSummaryText,
    bonusSummaryText,
    itemTypeLabel: getItemTypeLabel(item, copy),
    isDirectStepper,
    purchaseButtonText: quantity ? copy.addAnother : copy.selectOption,
    pricePrefixText: tierRows.length ? copy.priceFrom : ''
  };
}

function buildCartSummaryItem(orderItem, currencies, copy) {
  const menuItem = orderItem.menuItem || {};
  const totals = getCartItemTotals(orderItem);
  const originalDigits = getCurrencyFractionDigits(currencies.original, currencies.originalMeta);
  const selectedTierLabel = getTierLabel(menuItem.selectedOption || menuItem.selectedTier || {});
  const selectedAddOns = Array.isArray(menuItem.selectedAddOns) ? menuItem.selectedAddOns : [];
  const detailLines = [];

  if (selectedTierLabel) {
    detailLines.push(`${copy.selectedTier}: ${selectedTierLabel}`);
  }

  if ((menuItem.bundleItems || []).length) {
    detailLines.push(`${copy.bundleIncludes}: ${(menuItem.bundleItems || []).map(getBundleItemLabel).join(' / ')}`);
  }

  if (selectedAddOns.length) {
    detailLines.push(`${copy.selectedAddOns}: ${selectedAddOns.map(getAddOnLabel).join(' / ')}`);
  } else if ((menuItem.addOns || []).length) {
    detailLines.push(`${copy.addOnRule}: ${(menuItem.addOns || []).map(getAddOnLabel).join(' / ')}`);
  }

  if ((menuItem.bonusItems || []).length) {
    detailLines.push(`${copy.bonusRule}: ${(menuItem.bonusItems || []).map(getBonusLabel).join(' / ')}`);
  }

  if (menuItem.promotionSummary) {
    detailLines.push(`${copy.promotionSource}: ${menuItem.promotionSummary}`);
  }

  if (menuItem.rawPromotionText && menuItem.parseMode !== 'structured') {
    detailLines.push(`${copy.promotionFallback}: ${menuItem.rawPromotionText}`);
  }

  return {
    id: orderItem.id,
    title: menuItem.translatedName || menuItem.originalName || '',
    originalTitle: menuItem.originalName || '',
    quantity: Number(orderItem.quantity || 0),
    detailLines,
    unitPriceText: `${copy.unitPrice}: ${currencies.target} ${formatMoney(totals.unitConverted, 2)} / ${currencies.original} ${formatMoney(totals.unitOriginal, originalDigits)}`,
    subtotalText: `${copy.finalAmount}: ${currencies.target} ${formatMoney(totals.totalConverted, 2)}`,
    originalSubtotalText: `${currencies.original} ${formatMoney(totals.totalOriginal, originalDigits)}`
  };
}

Page({
  data: {
    menuItems: [],
    categories: [],
    visibleItems: [],
    selectedCategory: '',
    searchText: '',
    isSearching: false,
    cart: [],
    originalCurrency: 'USD',
    originalCurrencyMeta: { code: 'USD', fractionDigits: 2 },
    targetCurrency: 'CNY',
    targetCurrencyMeta: { code: 'CNY', fractionDigits: 2 },
    currencyOptions: getCurrencyOptionList('zh-CN', CURRENCY_OPTIONS),
    sourceCurrencyName: '美元',
    targetCurrencyName: '人民币',
    sourceCurrencyIndex: 0,
    targetCurrencyIndex: 7,
    currencySheetVisible: false,
    draftOriginalCurrency: 'USD',
    draftTargetCurrency: 'CNY',
    draftSourceCurrencyName: '美元',
    draftTargetCurrencyName: '人民币',
    draftSourceCurrencyIndex: 0,
    draftTargetCurrencyIndex: 7,
    exchangeRate: '1.0000',
    totalOriginalText: '0',
    totalConvertedText: '0',
    cartBadgeCount: 0,
    cartSummaryItems: [],
    lastError: '',
    globalAddOns: [],
    globalPromotionText: '',
    visibleGlobalPromotionText: '',
    showGlobalRuleCard: false,
    globalAddOnSummary: '',
    copy: getSystemCopy('zh-CN'),
    cartSheetVisible: false,
    selectorVisible: false,
    selectorItem: null,
    selectorItemTypeLabel: '',
    selectorTierRows: [],
    selectorAddOnRows: [],
    selectorBundleSummaryText: '',
    selectorBonusSummaryText: '',
    selectorSelectedTierId: '',
    selectorSelectedAddOnIds: [],
    selectorPreviewOriginalText: '0',
    selectorPreviewConvertedText: '0.00'
  },

  onShow() {
    const state = app.globalData;
    if (!state.menuItems.length) {
      wx.redirectTo({ url: '/pages/index/index' });
      return;
    }

    this.setData(
      {
        menuItems: state.menuItems,
        cart: state.cart,
        globalAddOns: state.globalAddOns || [],
        globalPromotionText: state.globalPromotionText || '',
        copy: getSystemCopy(state.systemLanguage),
        originalCurrency: state.originalCurrency,
        originalCurrencyMeta: state.originalCurrencyMeta || { code: state.originalCurrency, fractionDigits: 2 },
        targetCurrency: state.targetCurrency,
        targetCurrencyMeta: state.targetCurrencyMeta || { code: state.targetCurrency, fractionDigits: 2 },
        sourceCurrencyIndex: getCurrencyIndex(state.originalCurrency),
        targetCurrencyIndex: getCurrencyIndex(state.targetCurrency),
        exchangeRate: Number(state.exchangeRate || 1).toFixed(4),
        lastError: state.lastError || ''
      ,
        ...buildCurrencyUiState(state.systemLanguage, state.originalCurrency, state.targetCurrency),
        ...buildCurrencyDraftState(state.systemLanguage, state.originalCurrency, state.targetCurrency)
      },
      () => {
        wx.setNavigationBarTitle({ title: this.data.copy.menuTitle });
        this.recompute();
      }
    );
  },

  backHome() {
    app.setMenuResult({
      items: [],
      systemLanguage: app.globalData.systemLanguage || 'zh-CN',
      sourceLanguage: app.globalData.sourceLanguage,
      originalCurrency: 'USD',
      targetCurrency: 'CNY',
      exchangeRate: 1
    });
    wx.reLaunch({ url: '/pages/index/index' });
  },

  toggleSearch() {
    const nextValue = !this.data.isSearching;
    this.setData({
      isSearching: nextValue,
      searchText: nextValue ? this.data.searchText : ''
    }, () => this.recompute());
  },

  onSearchInput(event) {
    this.setData({ searchText: event.detail.value || '' }, () => this.recompute());
  },

  clearSearch() {
    this.setData({ searchText: '' }, () => this.recompute());
  },

  syncCurrencyDraftFromCurrent() {
    const language = app.globalData.systemLanguage || 'zh-CN';
    this.setData(buildCurrencyDraftState(language, this.data.originalCurrency, this.data.targetCurrency));
  },

  openCurrencySheet() {
    this.syncCurrencyDraftFromCurrent();
    this.setData({ currencySheetVisible: true });
  },

  closeCurrencySheet() {
    this.setData({ currencySheetVisible: false });
  },

  onDraftSourceCurrencyChange(event) {
    const option = this.data.currencyOptions[Number(event.detail.value || 0)];
    if (!option || !option.code) return;

    this.setData({
      draftOriginalCurrency: option.code,
      draftSourceCurrencyName: option.name,
      draftSourceCurrencyIndex: Number(event.detail.value || 0)
    });
  },

  onDraftTargetCurrencyChange(event) {
    const option = this.data.currencyOptions[Number(event.detail.value || 0)];
    if (!option || !option.code) return;

    this.setData({
      draftTargetCurrency: option.code,
      draftTargetCurrencyName: option.name,
      draftTargetCurrencyIndex: Number(event.detail.value || 0)
    });
  },

  swapCurrencyDraft() {
    const language = app.globalData.systemLanguage || 'zh-CN';
    this.setData(
      buildCurrencyDraftState(language, this.data.draftTargetCurrency, this.data.draftOriginalCurrency)
    );
  },

  confirmCurrencySheet() {
    const nextOriginalCurrency = this.data.draftOriginalCurrency || this.data.originalCurrency;
    const nextTargetCurrency = this.data.draftTargetCurrency || this.data.targetCurrency;

    if (
      nextOriginalCurrency === this.data.originalCurrency &&
      nextTargetCurrency === this.data.targetCurrency
    ) {
      this.closeCurrencySheet();
      return;
    }

    this.applyCurrencySelection(nextOriginalCurrency, nextTargetCurrency, {
      closeSheetOnSuccess: true
    });
  },

  noop() {},

  openCartSheet() {
    if (!this.data.cart.length) return;
    this.setData({ cartSheetVisible: true });
  },

  closeCartSheet() {
    this.setData({ cartSheetVisible: false });
  },

  selectCategory(event) {
    this.setData({
      selectedCategory: event.currentTarget.dataset.category
    }, () => this.recomputeVisibleItems());
  },

  addToCart(event) {
    const item = this.findItem(event.currentTarget.dataset.id);
    if (!item) return;

    if (item.itemType !== 'single' || (item.addOns || []).length) {
      this.openSelector(event);
      return;
    }

    const cart = [...this.data.cart];
    const entryId = getCartEntryId(item.id, '', []);
    const index = cart.findIndex((orderItem) => orderItem.id === entryId);
    if (index >= 0) {
      cart[index] = {
        ...cart[index],
        quantity: cart[index].quantity + 1
      };
    } else {
      cart.push({
        id: entryId,
        menuItem: item,
        quantity: 1
      });
    }

    this.syncCart(cart);
  },

  removeFromCart(event) {
    const itemId = event.currentTarget.dataset.id;
    const entryId = getCartEntryId(itemId, '', []);
    const cart = this.data.cart
      .map((orderItem) => {
        if (orderItem.id !== entryId) return orderItem;
        return {
          ...orderItem,
          quantity: orderItem.quantity - 1
        };
      })
      .filter((orderItem) => orderItem.quantity > 0);

    this.syncCart(cart);
  },

  incrementCartEntry(event) {
    const orderId = event.currentTarget.dataset.orderId;
    const cart = this.data.cart.map((orderItem) => {
      if (orderItem.id !== orderId) return orderItem;
      return {
        ...orderItem,
        quantity: Number(orderItem.quantity || 0) + 1
      };
    });
    this.syncCart(cart);
  },

  decrementCartEntry(event) {
    const orderId = event.currentTarget.dataset.orderId;
    const cart = this.data.cart
      .map((orderItem) => {
        if (orderItem.id !== orderId) return orderItem;
        return {
          ...orderItem,
          quantity: Number(orderItem.quantity || 0) - 1
        };
      })
      .filter((orderItem) => orderItem.quantity > 0);
    this.syncCart(cart);
  },

  openSelector(event) {
    const item = this.findItem(event.currentTarget.dataset.id);
    if (!item) return;

    this.setData(
      {
        selectorVisible: true,
        selectorItem: item,
        selectorSelectedTierId: item.tiers && item.tiers[0] ? item.tiers[0].id : '',
        selectorSelectedAddOnIds: (item.addOns || [])
          .filter((addOn) => addOn.required)
          .map((addOn) => addOn.id)
      },
      () => this.refreshSelectorPreview()
    );
  },

  closeSelector() {
    this.setData({
      selectorVisible: false,
      selectorItem: null,
      selectorItemTypeLabel: '',
      selectorTierRows: [],
      selectorAddOnRows: [],
      selectorBundleSummaryText: '',
      selectorBonusSummaryText: '',
      selectorSelectedTierId: '',
      selectorSelectedAddOnIds: [],
      selectorPreviewOriginalText: '0',
      selectorPreviewConvertedText: '0.00'
    });
  },

  selectTier(event) {
    this.setData(
      {
        selectorSelectedTierId: event.currentTarget.dataset.tierId
      },
      () => this.refreshSelectorPreview()
    );
  },

  toggleAddOn(event) {
    const addOnId = event.currentTarget.dataset.addOnId;
    const item = this.data.selectorItem || {};
    const addOn = (item.addOns || []).find((current) => current.id === addOnId);
    if (!addOn || addOn.required) return;

    const selected = this.data.selectorSelectedAddOnIds.includes(addOnId);
    const nextSelectedAddOnIds = selected
      ? this.data.selectorSelectedAddOnIds.filter((id) => id !== addOnId)
      : this.data.selectorSelectedAddOnIds.concat(addOnId);

    this.setData(
      {
        selectorSelectedAddOnIds: nextSelectedAddOnIds
      },
      () => this.refreshSelectorPreview()
    );
  },

  confirmSelection() {
    const item = this.data.selectorItem;
    if (!item) return;

    const { selectedTier, selectedAddOns } = this.getSelectorSelection(item);
    if ((item.tiers || []).length && !selectedTier) {
      return;
    }

    const entryId = getCartEntryId(
      item.id,
      selectedTier ? selectedTier.id : '',
      selectedAddOns.map((addOn) => addOn.id)
    );
    const cart = [...this.data.cart];
    const index = cart.findIndex((orderItem) => orderItem.id === entryId);

    if (index >= 0) {
      cart[index] = {
        ...cart[index],
        quantity: Number(cart[index].quantity || 0) + 1
      };
    } else {
      cart.push({
        id: entryId,
        menuItem: {
          ...item,
          selectedOption: selectedTier ? { ...selectedTier } : null,
          selectedAddOns: selectedAddOns.map((addOn) => ({ ...addOn }))
        },
        quantity: 1
      });
    }

    this.syncCart(cart, () => this.closeSelector());
  },

  openReceipt() {
    this.closeCartSheet();
    wx.navigateTo({ url: '/pages/receipt/receipt' });
  },

  findItem(itemId) {
    return this.data.menuItems.find((item) => item.id === itemId);
  },

  getSelectorSelection(item) {
    const selectedTier = (item.tiers || []).find((tier) => tier.id === this.data.selectorSelectedTierId) || null;
    const selectedAddOns = (item.addOns || []).filter((addOn) =>
      this.data.selectorSelectedAddOnIds.includes(addOn.id)
    );
    return {
      selectedTier,
      selectedAddOns
    };
  },

  refreshSelectorPreview() {
    const item = this.data.selectorItem;
    if (!item) return;

    const originalDigits = getCurrencyFractionDigits(this.data.originalCurrency, this.data.originalCurrencyMeta);
    const { selectedTier, selectedAddOns } = this.getSelectorSelection(item);
    const baseOriginalPrice = selectedTier
      ? Number(selectedTier.originalPrice || 0)
      : Number(item.displayOriginalPrice ?? item.originalPrice ?? 0);
    const baseConvertedPrice = selectedTier
      ? Number(selectedTier.convertedPrice || 0)
      : Number(item.displayConvertedPrice ?? item.convertedPrice ?? 0);
    const addOnOriginalTotal = selectedAddOns.reduce(
      (sum, addOn) => sum + Number(addOn.originalPriceDelta || 0),
      0
    );
    const addOnConvertedTotal = selectedAddOns.reduce(
      (sum, addOn) => sum + Number(addOn.convertedPriceDelta || 0),
      0
    );

    this.setData({
      selectorItemTypeLabel: getItemTypeLabel(item, this.data.copy),
      selectorTierRows: (item.tiers || []).map((tier) => ({
        id: tier.id,
        labelText: getTierLabel(tier),
        originalPriceText: formatMoney(tier.originalPrice, originalDigits),
        convertedPriceText: formatMoney(tier.convertedPrice, 2),
        selected: tier.id === this.data.selectorSelectedTierId
      })),
      selectorAddOnRows: (item.addOns || []).map((addOn) => ({
        id: addOn.id,
        labelText: getAddOnLabel(addOn),
        originalDeltaText: formatMoney(addOn.originalPriceDelta, originalDigits),
        convertedDeltaText: formatMoney(addOn.convertedPriceDelta, 2),
        required: Boolean(addOn.required),
        selected: this.data.selectorSelectedAddOnIds.includes(addOn.id)
      })),
      selectorBundleSummaryText: (item.bundleItems || []).map(getBundleItemLabel).join(' / '),
      selectorBonusSummaryText: (item.bonusItems || []).map(getBonusLabel).join(' / '),
      selectorPreviewOriginalText: formatMoney(baseOriginalPrice + addOnOriginalTotal, originalDigits),
      selectorPreviewConvertedText: formatMoney(baseConvertedPrice + addOnConvertedTotal, 2)
    });
  },

  syncCart(cart, callback) {
    app.globalData.cart = cart;
    this.setData({
      cart,
      cartSheetVisible: cart.length ? this.data.cartSheetVisible : false
    }, () => {
      this.recompute();
      if (typeof callback === 'function') {
        callback();
      }
    });
  },

  async applyCurrencySelection(nextOriginalCurrency, nextTargetCurrency, options = {}) {
    const originalCurrency = String(nextOriginalCurrency || this.data.originalCurrency).toUpperCase();
    const targetCurrency = String(nextTargetCurrency || this.data.targetCurrency).toUpperCase();
    const shouldCloseSheet = Boolean(options.closeSheetOnSuccess);

    if (originalCurrency === this.data.originalCurrency && targetCurrency === this.data.targetCurrency) {
      if (shouldCloseSheet) {
        this.closeCurrencySheet();
      }
      return;
    }

    wx.showLoading({
      title: this.data.copy.exchangeRate,
      mask: true
    });

    try {
      const rateResult = await fetchExchangeRate(originalCurrency, targetCurrency);
      const exchangeRate = Number(rateResult.exchangeRate || 1);
      const menuItems = (this.data.menuItems || []).map((item) => repriceMenuItem(item, exchangeRate));
      const cart = repriceCart(this.data.cart || [], exchangeRate);
      const globalAddOns = (this.data.globalAddOns || []).map((addOn) => repriceAddOn(addOn, exchangeRate));
      const selectorItem = this.data.selectorItem
        ? menuItems.find((item) => item.id === this.data.selectorItem.id) || null
        : null;
      const language = app.globalData.systemLanguage || 'zh-CN';

      app.globalData.menuItems = menuItems;
      app.globalData.cart = cart;
      app.globalData.globalAddOns = globalAddOns;
      app.globalData.originalCurrency = originalCurrency;
      app.globalData.originalCurrencyMeta = rateResult.originalCurrencyMeta || { code: originalCurrency, fractionDigits: 2 };
      app.globalData.targetCurrency = targetCurrency;
      app.globalData.targetCurrencyMeta = rateResult.targetCurrencyMeta || { code: targetCurrency, fractionDigits: 2 };
      app.globalData.exchangeRate = exchangeRate;

      this.setData({
        menuItems,
        cart,
        globalAddOns,
        originalCurrency,
        originalCurrencyMeta: app.globalData.originalCurrencyMeta,
        targetCurrency,
        targetCurrencyMeta: app.globalData.targetCurrencyMeta,
        ...buildCurrencyUiState(language, originalCurrency, targetCurrency),
        ...buildCurrencyDraftState(language, originalCurrency, targetCurrency),
        sourceCurrencyIndex: getCurrencyIndex(originalCurrency),
        targetCurrencyIndex: getCurrencyIndex(targetCurrency),
        exchangeRate: exchangeRate.toFixed(4),
        selectorItem,
        currencySheetVisible: shouldCloseSheet ? false : this.data.currencySheetVisible
      }, () => {
        this.recompute();
        if (selectorItem) {
          this.refreshSelectorPreview();
        }
      });
    } catch (error) {
      wx.showToast({
        title: error.message || this.data.copy.backendHint,
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  recompute() {
    const query = this.data.searchText.trim().toLowerCase();
    const filteredItems = this.data.menuItems.filter((item) => {
      if (!query) return true;
      return [
        item.category,
        item.originalName,
        item.translatedName
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });

    const categories = Array.from(new Set(filteredItems.map((item) => item.category || '其他')));
    const selectedCategory = categories.includes(this.data.selectedCategory)
      ? this.data.selectedCategory
      : categories[0] || '';
    const totals = getCartTotals(this.data.cart);
    const globalAddOnSummary = (this.data.globalAddOns || [])
      .map((addOn) => {
        const label = addOn.translatedLabel || addOn.label || addOn.originalLabel || '';
        const originalDelta = Number(addOn.originalPriceDelta || addOn.originalPrice || 0);
        if (!label) return '';
        return `${label} (${this.data.originalCurrency} ${formatMoney(originalDelta, getCurrencyFractionDigits(this.data.originalCurrency, this.data.originalCurrencyMeta))})`;
      })
      .filter(Boolean)
      .join(' / ');
    const visibleGlobalPromotionText = getVisibleGlobalPromotionText(this.data.globalPromotionText);
    const showGlobalRuleCard = Boolean(globalAddOnSummary || visibleGlobalPromotionText);
    const cartBadgeCount = this.data.cart.reduce(
      (sum, orderItem) => sum + Number(orderItem.quantity || 0),
      0
    );
    const cartSummaryItems = this.data.cart.map((orderItem) =>
      buildCartSummaryItem(
        orderItem,
        {
          original: this.data.originalCurrency,
          originalMeta: this.data.originalCurrencyMeta,
          target: this.data.targetCurrency
        },
        this.data.copy
      )
    );

    this.setData({
      categories,
      selectedCategory,
      totalOriginalText: formatMoney(totals.original, getCurrencyFractionDigits(this.data.originalCurrency, this.data.originalCurrencyMeta)),
      totalConvertedText: formatMoney(totals.converted, 2),
      globalAddOnSummary,
      visibleGlobalPromotionText,
      showGlobalRuleCard,
      cartBadgeCount,
      cartSummaryItems
    }, () => this.recomputeVisibleItems(filteredItems));
  },

  recomputeVisibleItems(sourceItems) {
    const query = this.data.searchText.trim().toLowerCase();
    const baseItems = sourceItems || this.data.menuItems.filter((item) => {
      if (!query) return true;
      return [
        item.category,
        item.originalName,
        item.translatedName
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });

    const quantityById = this.data.cart.reduce((map, orderItem) => {
      map[orderItem.menuItem.id] = (map[orderItem.menuItem.id] || 0) + Number(orderItem.quantity || 0);
      return map;
    }, {});

    const visibleItems = baseItems
      .filter((item) => item.category === this.data.selectedCategory)
      .map((item) =>
        buildMenuDisplayItem(
          item,
          quantityById,
          {
            original: this.data.originalCurrency,
            originalMeta: this.data.originalCurrencyMeta,
            target: this.data.targetCurrency
          },
          this.data.copy
        )
      );

    this.setData({ visibleItems });
  }
});
