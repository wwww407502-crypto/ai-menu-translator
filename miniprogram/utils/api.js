const { API_BASE_URL } = require('./config');

function uploadImageForParsing(filePath, options = {}) {
  const {
    targetLang = 'zh-CN',
    targetCurrency = 'CNY',
    parseErrorMessage = 'The server returned data in an invalid format',
    uploadErrorMessage = 'Image upload failed'
  } = options;

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}/menu/parse`,
      filePath,
      name: 'image',
      formData: {
        targetLang,
        targetCurrency
      },
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(res.data || `HTTP ${res.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(res.data));
        } catch (error) {
          reject(new Error(parseErrorMessage));
        }
      },
      fail(error) {
        reject(new Error(error.errMsg || uploadErrorMessage));
      }
    });
  });
}

function fetchExchangeRate(fromCurrency, toCurrency, options = {}) {
  const {
    errorMessage = 'Exchange rate request failed'
  } = options;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}/exchange-rate`,
      method: 'GET',
      data: {
        from: fromCurrency,
        to: toCurrency
      },
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(res.data || `HTTP ${res.statusCode}`));
          return;
        }
        resolve(res.data);
      },
      fail(error) {
        reject(new Error(error.errMsg || errorMessage));
      }
    });
  });
}

module.exports = {
  uploadImageForParsing,
  fetchExchangeRate
};
