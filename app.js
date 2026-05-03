App({
  globalData: {
    menuItems: [],
    cart: [],
    originalCurrency: 'USD',
    targetCurrency: 'CNY',
    exchangeRate: 1,
    lastError: ''
  },

  setMenuResult(result) {
    this.globalData.menuItems = result.items || [];
    this.globalData.cart = [];
    this.globalData.originalCurrency = result.originalCurrency || 'USD';
    this.globalData.targetCurrency = result.targetCurrency || 'CNY';
    this.globalData.exchangeRate = Number(result.exchangeRate || 1);
    this.globalData.lastError = result.lastError || '';
  },

  resetOrder() {
    this.globalData.cart = [];
  }
});
