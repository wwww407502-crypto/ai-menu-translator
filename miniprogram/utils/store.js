const app = getApp();

function getDefaultState() {
  return {
    menuItems: [],
    cart: [],
    globalAddOns: [],
    globalDiscountRules: [],
    globalPromotionText: '',
    parseWarnings: [],
    systemLanguage: 'zh-CN',
    sourceLanguage: 'en',
    originalCurrency: 'USD',
    originalCurrencyMeta: { code: 'USD', fractionDigits: 2 },
    targetCurrency: 'CNY',
    targetCurrencyMeta: { code: 'CNY', fractionDigits: 2 },
    exchangeRate: 1,
    lastError: '',
    pageCount: 1
  };
}

function getState() {
  return app.globalData;
}

function setState(partial) {
  Object.assign(app.globalData, partial);
}

function setMenuResult(result) {
  setState({
    menuItems: result.items || [],
    cart: [],
    globalAddOns: result.globalAddOns || [],
    globalDiscountRules: result.globalDiscountRules || [],
    globalPromotionText: result.globalPromotionText || '',
    parseWarnings: result.parseWarnings || [],
    systemLanguage: result.systemLanguage || app.globalData.systemLanguage || 'zh-CN',
    sourceLanguage: result.sourceLanguage || 'en',
    originalCurrency: result.originalCurrency || 'USD',
    originalCurrencyMeta: result.originalCurrencyMeta || { code: result.originalCurrency || 'USD', fractionDigits: 2 },
    targetCurrency: result.targetCurrency || 'CNY',
    targetCurrencyMeta: result.targetCurrencyMeta || { code: result.targetCurrency || 'CNY', fractionDigits: 2 },
    exchangeRate: Number(result.exchangeRate || 1),
    lastError: result.lastError || '',
    pageCount: Number(result.pageCount || 1)
  });
}

function resetOrder() {
  setState({ cart: [] });
}

function getCart() {
  return app.globalData.cart;
}

function setCart(cart) {
  app.globalData.cart = cart;
}

function getMenuItems() {
  return app.globalData.menuItems;
}

function setMenuItems(items) {
  app.globalData.menuItems = items;
}

function getSystemLanguage() {
  return app.globalData.systemLanguage || 'zh-CN';
}

function getExchangeRate() {
  return Number(app.globalData.exchangeRate || 1);
}

function getCurrencyInfo() {
  return {
    originalCurrency: app.globalData.originalCurrency,
    originalCurrencyMeta: app.globalData.originalCurrencyMeta || { code: app.globalData.originalCurrency, fractionDigits: 2 },
    targetCurrency: app.globalData.targetCurrency,
    targetCurrencyMeta: app.globalData.targetCurrencyMeta || { code: app.globalData.targetCurrency, fractionDigits: 2 },
    exchangeRate: Number(app.globalData.exchangeRate || 1)
  };
}

module.exports = {
  getState,
  setState,
  getDefaultState,
  setMenuResult,
  resetOrder,
  getCart,
  setCart,
  getMenuItems,
  setMenuItems,
  getSystemLanguage,
  getExchangeRate,
  getCurrencyInfo
};
