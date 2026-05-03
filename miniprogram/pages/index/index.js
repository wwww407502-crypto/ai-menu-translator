const { uploadImageForParsing } = require('../../utils/api');
const { demoResponse } = require('../../utils/demoData');
const { normalizeLanguageTag, withMenuItemIds } = require('../../utils/format');
const { normalizeAppLanguage, inferSourceLanguage, getSystemCopy } = require('../../utils/i18n');

const app = getApp();

Page({
  data: {
    isProcessing: false,
    errorMessage: '',
    copy: getSystemCopy('zh-CN')
  },

  onShow() {
    const systemLanguage = normalizeAppLanguage(wx.getSystemInfoSync().language);
    const copy = getSystemCopy(systemLanguage);

    app.globalData.systemLanguage = systemLanguage;
    this.setData({ copy });
    wx.setNavigationBarTitle({ title: copy.appTitle });
  },

  takePhoto() {
    this.pickImage(['camera']);
  },

  chooseFromAlbum() {
    this.pickImage(['album']);
  },

  pickImage(sourceType) {
    if (!wx.chooseMedia) {
      wx.chooseImage({
        count: 1,
        sourceType,
        success: (res) => {
          const filePath = res.tempFilePaths && res.tempFilePaths[0];
          if (filePath) {
            this.processImage(filePath);
          }
        },
        fail: (error) => {
          if (!/cancel/i.test(error.errMsg || '')) {
            this.setData({ errorMessage: this.data.copy.imageMissing });
          }
        }
      });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (file && file.tempFilePath) {
          this.processImage(file.tempFilePath);
        }
      },
      fail: (error) => {
        if (!/cancel/i.test(error.errMsg || '')) {
          this.setData({ errorMessage: this.data.copy.imageMissing });
        }
      }
    });
  },

  async processImage(filePath) {
    this.setData({
      isProcessing: true,
      errorMessage: ''
    });

    const systemLanguage = normalizeAppLanguage(wx.getSystemInfoSync().language);
    const targetLang = normalizeLanguageTag(systemLanguage);
    const targetCurrency = 'CNY';
    const copy = getSystemCopy(systemLanguage);

    try {
      const response = await uploadImageForParsing(filePath, {
        targetLang,
        targetCurrency,
        parseErrorMessage: copy.parseError,
        uploadErrorMessage: copy.uploadError
      });
      this.openMenu(response, systemLanguage);
    } catch (error) {
      const message = `${copy.fallbackError}${error.message || error}`;
      this.openMenu({
        ...demoResponse,
        lastError: message
      }, systemLanguage);
    } finally {
      this.setData({ isProcessing: false });
    }
  },

  openMenu(response, systemLanguage) {
    app.setMenuResult({
      ...response,
      systemLanguage,
      sourceLanguage: response.sourceLanguage || inferSourceLanguage(response.items || []),
      items: withMenuItemIds(response.items),
      lastError: response.lastError || ''
    });

    wx.navigateTo({
      url: '/pages/menu/menu'
    });
  }
});
