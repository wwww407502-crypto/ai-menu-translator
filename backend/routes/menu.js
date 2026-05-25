const express = require('express');
const router = express.Router();
const { ensureSupportedCurrency } = require('../lib/currency');
const { ensureAllowedTargetLanguage } = require('../lib/validators');
const { resolveExchangeRate } = require('../services/exchange-rate');
const { parseMenuImageWithFallback } = require('../services/menu-parser');
const { normalizeParsedItem } = require('../lib/item-normalizer');
const { inferGlobalAddOns, inferGlobalDiscountRules, normalizeGlobalPromotionText } = require('../lib/global-rules');
const { inferSourceLanguage } = require('../lib/language');
const { inferCurrencyFromText, resolveOriginalCurrency, normalizeCurrencyCode, getCurrencyFractionDigits } = require('../lib/currency');
const { normalizeUploadedMimeType, validateUploadedImage } = require('../middleware/upload');
const { toTrimmedString } = require('../lib/utils');
const requireApiKeyIfConfigured = require('../middleware/api-key');
const { enforceParseConcurrency } = require('../middleware/parse-concurrency');

const upload = require('../middleware/upload').createUploadMiddleware();

router.post(
    '/api/v1/menu/parse',
    requireApiKeyIfConfigured,
    enforceParseConcurrency,
    upload.single('image'),
    async (req, res, next) => {
        try {
            const requestStartedAt = Date.now();
            validateUploadedImage(req.file);

            const targetLang = ensureAllowedTargetLanguage(req.body && req.body.targetLang);
            const targetCurrency = ensureSupportedCurrency((req.body && req.body.targetCurrency) || 'CNY', 'targetCurrency');

            const base64Image = req.file.buffer.toString('base64');
            const mimeType = normalizeUploadedMimeType(req.file.mimetype);
            console.log('[menu-parse:start]', {
                requestId: req.requestId,
                fileName: toTrimmedString(req.file && req.file.originalname) || 'unknown',
                mimeType,
                bytes: req.file && (req.file.size || (req.file.buffer && req.file.buffer.length)) || 0,
                targetLang,
                targetCurrency
            });
            const {
                aiResponse,
                parseStrategy,
                parseWarnings
            } = await parseMenuImageWithFallback({
                base64Image,
                mimeType,
                targetLang,
                requestId: req.requestId
            });
            const sourceLanguage = aiResponse.sourceLanguage || inferSourceLanguage(aiResponse.items || []);
            let items = Array.isArray(aiResponse.items) ? aiResponse.items : [];
            const inferredOriginalCurrency = inferCurrencyFromText(JSON.stringify({
                originalCurrency: aiResponse.originalCurrency,
                globalPromotionText: aiResponse.globalPromotionText,
                footerText: aiResponse.footerText,
                items: items.map((item) => ({
                    originalName: item && item.originalName,
                    translatedName: item && item.translatedName,
                    originalPriceText: item && item.originalPriceText,
                    priceText: item && item.priceText,
                    rawPromotionText: item && item.rawPromotionText
                }))
            }));
            const originalCurrency = resolveOriginalCurrency(
                aiResponse.originalCurrency,
                inferredOriginalCurrency,
                targetCurrency
            );
            if (originalCurrency !== resolveOriginalCurrency(aiResponse.originalCurrency)) {
                console.warn('[currency:fallback]', {
                    requestId: req.requestId,
                    aiOriginalCurrency: aiResponse.originalCurrency || null,
                    inferredOriginalCurrency,
                    fallbackCurrency: originalCurrency
                });
            }
            let effectiveTargetCurrency = targetCurrency;
            let exchangeRate = 1;
            try {
                exchangeRate = await resolveExchangeRate(originalCurrency, targetCurrency);
            } catch (error) {
                console.warn('[exchange-rate:fallback]', {
                    requestId: req.requestId,
                    fromCurrency: originalCurrency,
                    toCurrency: targetCurrency,
                    message: error && error.message,
                    code: error && error.errorCode
                });
                effectiveTargetCurrency = originalCurrency;
                exchangeRate = 1;
            }

            items = items.map((item, index) => normalizeParsedItem(item, index, exchangeRate, originalCurrency));
            const globalAddOns = inferGlobalAddOns(aiResponse, exchangeRate, originalCurrency);
            const globalDiscountRules = inferGlobalDiscountRules(aiResponse, exchangeRate, originalCurrency);
            const originalCurrencyMeta = {
                code: originalCurrency,
                fractionDigits: getCurrencyFractionDigits(originalCurrency)
            };
            const targetCurrencyCode = normalizeCurrencyCode(effectiveTargetCurrency);
            const targetCurrencyMeta = {
                code: targetCurrencyCode,
                fractionDigits: getCurrencyFractionDigits(targetCurrencyCode)
            };
            const globalPromotionText = normalizeGlobalPromotionText(
                aiResponse.globalPromotionText
                || aiResponse.globalAddOnText
                || aiResponse.footerText
            );

            const imageBytes = req.file && (req.file.size || (req.file.buffer && req.file.buffer.length)) || 0;
            if (parseStrategy !== 'degraded' && items.length <= 5 && imageBytes > 800 * 1024) {
                parseWarnings.push(
                    `Large image (${(imageBytes / 1024).toFixed(0)}KB) yielded only ${items.length} items. ` +
                    `The menu may be too dense — consider splitting sections or retrying.`
                );
            }

            res.json({
                sourceLanguage,
                originalCurrency,
                targetCurrency: effectiveTargetCurrency,
                originalCurrencyMeta,
                targetCurrencyMeta,
                exchangeRate,
                globalPromotionText,
                globalAddOns,
                globalDiscountRules,
                parseStrategy,
                parseWarnings,
                pageCount: 1,
                items
            });
            console.log('[menu-parse:done]', {
                requestId: req.requestId,
                durationMs: Date.now() - requestStartedAt,
                parseStrategy,
                warnings: parseWarnings.length,
                originalCurrency,
                targetCurrency: effectiveTargetCurrency,
                itemCount: items.length
            });

        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
