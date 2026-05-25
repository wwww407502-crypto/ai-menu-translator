const { uploadImageForParsing, uploadImagesForMultiParsing } = require('../../utils/api');
const { normalizeLanguageTag, withMenuItemIds } = require('../../utils/format');
const { normalizeAppLanguage, inferSourceLanguage, getSystemCopy } = require('../../utils/i18n');
const { mergeMultiPageResults } = require('../../utils/merge');
const store = require('../../utils/store');

function getSystemLanguageTag() {
  try {
    if (wx.getAppBaseInfo) {
      const appBaseInfo = wx.getAppBaseInfo();
      if (appBaseInfo && appBaseInfo.language) {
        return appBaseInfo.language;
      }
    }
  } catch (error) {
  }

  try {
    return wx.getSystemInfoSync().language;
  } catch (error) {
    return 'zh-CN';
  }
}

function compressImageIfPossible(filePath) {
  return new Promise((resolve) => {
    if (!wx.compressImage) {
      resolve(filePath);
      return;
    }

    wx.compressImage({
      src: filePath,
      quality: 65,
      success: (res) => {
        resolve((res && res.tempFilePath) || filePath);
      },
      fail: () => {
        resolve(filePath);
      }
    });
  });
}

Page({
  data: {
    isProcessing: false,
    errorMessage: '',
    copy: getSystemCopy('zh-CN'),
    multiMode: false,
    selectedFiles: [],
    uploadingCount: 0,
    uploadTotal: 0
  },

  onShow() {
    const systemLanguage = normalizeAppLanguage(getSystemLanguageTag());
    const copy = getSystemCopy(systemLanguage);

    store.setState({ systemLanguage });
    this.setData({ copy, multiMode: false, selectedFiles: [] });
    wx.setNavigationBarTitle({ title: copy.appTitle });
  },

  takePhoto() {
    this.pickImage(['camera']);
  },

  chooseFromAlbum() {
    this.pickImage(['album']);
  },

  chooseMultipleFromAlbum() {
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 5,
        mediaType: ['image'],
        sourceType: ['album'],
        sizeType: ['compressed'],
        success: (res) => {
          const files = (res.tempFiles || []).map(f => f.tempFilePath).filter(Boolean);
          if (files.length === 1) {
            this.processImage(files[0]);
          } else if (files.length > 1) {
            this.setData({ multiMode: true, selectedFiles: files });
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

    wx.chooseImage({
      count: 5,
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const files = (res.tempFilePaths || []).filter(Boolean);
        if (files.length === 1) {
          this.processImage(files[0]);
        } else if (files.length > 1) {
          this.setData({ multiMode: true, selectedFiles: files });
        }
      },
      fail: (error) => {
        if (!/cancel/i.test(error.errMsg || '')) {
          this.setData({ errorMessage: this.data.copy.imageMissing });
        }
      }
    });
  },

  removeSelectedFile(e) {
    const index = Number(e.currentTarget.dataset.index);
    const files = this.data.selectedFiles.filter((_, i) => i !== index);
    if (files.length <= 1) {
      this.setData({ multiMode: false, selectedFiles: [] });
    } else {
      this.setData({ selectedFiles: files });
    }
  },

  cancelMultiMode() {
    this.setData({ multiMode: false, selectedFiles: [] });
  },

  async processMultiImages() {
    const files = this.data.selectedFiles;
    if (!files.length) return;

    this.setData({
      isProcessing: true,
      errorMessage: '',
      uploadingCount: 0,
      uploadTotal: files.length
    });

    const systemLanguage = normalizeAppLanguage(getSystemLanguageTag());
    const targetLang = normalizeLanguageTag(systemLanguage);
    const targetCurrency = 'CNY';
    const copy = getSystemCopy(systemLanguage);

    try {
      const compressedFiles = [];
      for (const fp of files) {
        const compressed = await compressImageIfPossible(fp);
        compressedFiles.push(compressed);
      }

      const pageResults = [];
      for (let i = 0; i < compressedFiles.length; i++) {
        this.setData({ uploadingCount: i + 1 });
        const response = await uploadImageForParsing(compressedFiles[i], {
          targetLang,
          targetCurrency,
          parseErrorMessage: copy.parseError,
          uploadErrorMessage: copy.uploadError,
          timeoutErrorMessage: copy.parseTimeout,
          providerErrorMessage: copy.providerError
        });
        pageResults.push(response);
      }

      const merged = mergeMultiPageResults(pageResults);
      this.openMenu(merged, systemLanguage);
    } catch (error) {
      this.setData({
        errorMessage: error.message || String(error || copy.uploadError)
      });
    } finally {
      this.setData({
        isProcessing: false,
        uploadingCount: 0,
        uploadTotal: 0,
        multiMode: false,
        selectedFiles: []
      });
    }
  },

  pickImage(sourceType) {
    if (!wx.chooseMedia) {
      wx.chooseImage({
        count: 1,
        sourceType,
        sizeType: ['compressed'],
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
      sizeType: ['compressed'],
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

    const systemLanguage = normalizeAppLanguage(getSystemLanguageTag());
    const targetLang = normalizeLanguageTag(systemLanguage);
    const targetCurrency = 'CNY';
    const copy = getSystemCopy(systemLanguage);

    try {
      const uploadPath = await compressImageIfPossible(filePath);
      const response = await uploadImageForParsing(uploadPath, {
        targetLang,
        targetCurrency,
        parseErrorMessage: copy.parseError,
        uploadErrorMessage: copy.uploadError,
        timeoutErrorMessage: copy.parseTimeout,
        providerErrorMessage: copy.providerError
      });
      this.openMenu(response, systemLanguage);
    } catch (error) {
      this.setData({
        errorMessage: error.message || String(error || copy.uploadError)
      });
    } finally {
      this.setData({ isProcessing: false });
    }
  },

  openMenu(response, systemLanguage) {
    const app = getApp();
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
