var PROD_API_BASE_URL = 'https://api.你的域名.com/api/v1';

var API_BASE_URL = 'http://127.0.0.1:3000/api/v1';
var UPLOAD_TIMEOUT_MS = 300000;
var REQUEST_TIMEOUT_MS = 15000;

function resolveApiBaseUrl() {
  try {
    var accountInfo = wx.getAccountInfoSync();
    var envVersion = (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion) || 'develop';
    if (envVersion !== 'develop') {
      API_BASE_URL = PROD_API_BASE_URL;
    }
  } catch (e) {}
}

resolveApiBaseUrl();

module.exports = {
  API_BASE_URL: API_BASE_URL,
  UPLOAD_TIMEOUT_MS: UPLOAD_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS: REQUEST_TIMEOUT_MS
};
