App({
  globalData: {
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
  },

  setMenuResult(result) {
    this.globalData.menuItems = result.items || [];
    this.globalData.cart = [];
    this.globalData.globalAddOns = result.globalAddOns || [];
    this.globalData.globalDiscountRules = result.globalDiscountRules || [];
    this.globalData.globalPromotionText = result.globalPromotionText || '';
    this.globalData.parseWarnings = result.parseWarnings || [];
    this.globalData.systemLanguage = result.systemLanguage || this.globalData.systemLanguage || 'zh-CN';
    this.globalData.sourceLanguage = result.sourceLanguage || 'en';
    this.globalData.originalCurrency = result.originalCurrency || 'USD';
    this.globalData.originalCurrencyMeta = result.originalCurrencyMeta || { code: this.globalData.originalCurrency, fractionDigits: 2 };
    this.globalData.targetCurrency = result.targetCurrency || 'CNY';
    this.globalData.targetCurrencyMeta = result.targetCurrencyMeta || { code: this.globalData.targetCurrency, fractionDigits: 2 };
    this.globalData.exchangeRate = Number(result.exchangeRate || 1);
    this.globalData.lastError = result.lastError || '';
    this.globalData.pageCount = Number(result.pageCount || 1);
  },

  resetOrder() {
    this.globalData.cart = [];
  }
});
