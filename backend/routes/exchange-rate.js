const express = require('express');
const router = express.Router();
const { ensureSupportedCurrency, getCurrencyFractionDigits } = require('../lib/currency');
const { resolveExchangeRate } = require('../services/exchange-rate');
const requireApiKeyIfConfigured = require('../middleware/api-key');

router.get('/api/v1/exchange-rate', requireApiKeyIfConfigured, async (req, res, next) => {
    try {
        const fromCurrency = ensureSupportedCurrency(req.query.from || 'USD', 'from');
        const toCurrency = ensureSupportedCurrency(req.query.to || 'CNY', 'to');
        const exchangeRate = await resolveExchangeRate(fromCurrency, toCurrency);

        res.json({
            fromCurrency,
            toCurrency,
            exchangeRate,
            originalCurrencyMeta: {
                code: fromCurrency,
                fractionDigits: getCurrencyFractionDigits(fromCurrency)
            },
            targetCurrencyMeta: {
                code: toCurrency,
                fractionDigits: getCurrencyFractionDigits(toCurrency)
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
