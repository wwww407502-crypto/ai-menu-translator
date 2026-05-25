const axios = require('axios');
const { HttpError, UpstreamServiceError } = require('../errors');
const { isTimeoutError } = require('../lib/utils');
const { normalizeCurrencyCode, isSupportedCurrency } = require('../lib/currency');
const { fallbackRates, exchangeRateTimeoutMs } = require('../config');

async function resolveExchangeRate(fromCurrency, toCurrency) {
    const sourceCurrency = normalizeCurrencyCode(fromCurrency);
    const targetCurrency = normalizeCurrencyCode(toCurrency);

    if (!sourceCurrency || !targetCurrency) {
        throw new HttpError(400, 'INVALID_CURRENCY', 'Currency code is required.');
    }

    if (!isSupportedCurrency(sourceCurrency) || !isSupportedCurrency(targetCurrency)) {
        throw new HttpError(400, 'INVALID_CURRENCY', 'Unsupported currency code.');
    }

    if (sourceCurrency === targetCurrency) {
        return 1;
    }

    try {
        const response = await axios.get(`https://open.er-api.com/v6/latest/${sourceCurrency}`, {
            timeout: exchangeRateTimeoutMs
        });
        if (response.data && response.data.rates && response.data.rates[targetCurrency]) {
            return response.data.rates[targetCurrency];
        }
        throw new Error('Rate not found');
    } catch (error) {
        if (fallbackRates[sourceCurrency] && fallbackRates[sourceCurrency][targetCurrency]) {
            return fallbackRates[sourceCurrency][targetCurrency];
        }

        if (isTimeoutError(error)) {
            throw new UpstreamServiceError('Exchange rate request timed out.', 'EXCHANGE_RATE_TIMEOUT', undefined, 504);
        }

        throw new UpstreamServiceError('Failed to resolve exchange rate.', 'EXCHANGE_RATE_UNAVAILABLE');
    }
}

module.exports = { resolveExchangeRate };
