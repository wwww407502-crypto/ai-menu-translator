const { API_BASE_URL, UPLOAD_TIMEOUT_MS, REQUEST_TIMEOUT_MS } = require('./config');

function buildErrorFromResponse(data, fallbackMessage, messages = {}) {
  let payload = data;
  if (typeof data === 'string') {
    try {
      payload = JSON.parse(data);
    } catch (error) {
      return new Error(data || fallbackMessage);
    }
  }

  if (payload && typeof payload === 'object') {
    const requestId = payload.requestId ? ` (ID: ${payload.requestId})` : '';
    const detailText = [
      payload.error,
      payload.message,
      payload.details && payload.details.upstreamMessage,
      payload.details && payload.details.fallbackError && payload.details.fallbackError.message
    ].filter(Boolean).join(' ');
    if (
      payload.code === 'UPSTREAM_TIMEOUT' ||
      payload.code === 'EXCHANGE_RATE_TIMEOUT' ||
      /timeout|timed\s*out/i.test(detailText)
    ) {
      return new Error(`${messages.timeoutErrorMessage || 'Menu parsing timed out. Please try again with a clearer photo.'}${requestId}`);
    }
    if (payload.code === 'AI_PROVIDER_NOT_CONFIGURED') {
      return new Error(`${messages.providerErrorMessage || 'Backend AI provider is not configured.'}${requestId}`);
    }
    return new Error(`${payload.error || payload.message || fallbackMessage}${requestId}`);
  }

  return new Error(fallbackMessage);
}

function uploadImageForParsing(filePath, options = {}) {
  const {
    targetLang = 'zh-CN',
    targetCurrency = 'CNY',
    parseErrorMessage = 'The server returned data in an invalid format',
    uploadErrorMessage = 'Image upload failed',
    timeoutErrorMessage = 'Menu parsing timed out. Please try again with a clearer photo.',
    providerErrorMessage = 'Backend AI provider is not configured.'
  } = options;

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}/menu/parse`,
      timeout: UPLOAD_TIMEOUT_MS,
      filePath,
      name: 'image',
      formData: {
        targetLang,
        targetCurrency
      },
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(buildErrorFromResponse(res.data, `HTTP ${res.statusCode}`, {
            timeoutErrorMessage,
            providerErrorMessage
          }));
          return;
        }

        try {
          resolve(JSON.parse(res.data));
        } catch (error) {
          reject(new Error(parseErrorMessage));
        }
      },
      fail(error) {
        const errMsg = String(error && error.errMsg || '');
        if (/timeout|timed\s*out/i.test(errMsg)) {
          reject(new Error(timeoutErrorMessage));
          return;
        }
        if (/fail|url not in domain list|ERR_CONNECTION|ECONNREFUSED|connect/i.test(errMsg)) {
          reject(new Error(`Cannot connect to backend: ${errMsg || uploadErrorMessage}`));
          return;
        }
        reject(new Error(errMsg || uploadErrorMessage));
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
      timeout: REQUEST_TIMEOUT_MS,
      data: {
        from: fromCurrency,
        to: toCurrency
      },
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(buildErrorFromResponse(res.data, `HTTP ${res.statusCode}`, {
            timeoutErrorMessage: 'Exchange rate request timed out. Please try again.'
          }));
          return;
        }
        resolve(res.data);
      },
      fail(error) {
        const errMsg = String(error && error.errMsg || '');
        if (/timeout|timed\s*out/i.test(errMsg)) {
          reject(new Error('Exchange rate request timed out. Please try again.'));
          return;
        }
        if (/fail|url not in domain list|ERR_CONNECTION|ECONNREFUSED|connect/i.test(errMsg)) {
          reject(new Error(`Cannot connect to backend: ${errMsg || errorMessage}`));
          return;
        }
        reject(new Error(errMsg || errorMessage));
      }
    });
  });
}

module.exports = {
  uploadImageForParsing,
  fetchExchangeRate,
  uploadImagesForMultiParsing
};

async function uploadImagesForMultiParsing(filePaths, options = {}) {
  const results = [];
  for (const filePath of filePaths) {
    const result = await uploadImageForParsing(filePath, options);
    results.push(result);
  }
  return results;
}
