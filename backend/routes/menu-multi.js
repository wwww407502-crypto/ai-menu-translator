const express = require('express');
const router = express.Router();
const { ensureSupportedCurrency, resolveOriginalCurrency, normalizeCurrencyCode, getCurrencyFractionDigits, inferCurrencyFromText } = require('../lib/currency');
const { ensureAllowedTargetLanguage } = require('../lib/validators');
const { resolveExchangeRate } = require('../services/exchange-rate');
const { parseMenuImageWithFallback } = require('../services/menu-parser');
const { normalizeParsedItem } = require('../lib/item-normalizer');
const { inferGlobalAddOns, inferGlobalDiscountRules, normalizeGlobalPromotionText } = require('../lib/global-rules');
const { inferSourceLanguage } = require('../lib/language');
const { normalizeUploadedMimeType } = require('../middleware/upload');
const { toTrimmedString } = require('../lib/utils');
const { mergeMenuResults } = require('../lib/menu-merger');
const requireApiKeyIfConfigured = require('../middleware/api-key');
const { enforceParseConcurrency } = require('../middleware/parse-concurrency');
const upload = require('../middleware/upload').createUploadMiddleware();

const MAX_MULTI_UPLOAD_FILES = Number(process.env.MAX_MULTI_UPLOAD_FILES || 5);

function validateUploadedFiles(files) {
    if (!files || !files.length) {
        const { HttpError } = require('../errors');
        throw new HttpError(400, 'IMAGES_REQUIRED', 'At least one image is required.');
    }
    files.forEach((file) => require('../middleware/upload').validateUploadedImage(file));
}

router.post(
    '/api/v1/menu/parse-multi',
    requireApiKeyIfConfigured,
    enforceParseConcurrency,
    upload.array('images', MAX_MULTI_UPLOAD_FILES),
    async (req, res, next) => {
        try {
            const requestStartedAt = Date.now();
            const files = Array.isArray(req.files) ? req.files : [];
            validateUploadedFiles(files);

            const targetLang = ensureAllowedTargetLanguage(req.body && req.body.targetLang);
            const targetCurrency = ensureSupportedCurrency((req.body && req.body.targetCurrency) || 'CNY', 'targetCurrency');

            console.log('[menu-parse-multi:start]', {
                requestId: req.requestId,
                pageCount: files.length,
                targetLang,
                targetCurrency
            });

            let determinedOriginalCurrency = null;
            let determinedSourceLanguage = null;
            let effectiveTargetCurrency = targetCurrency;
            let exchangeRate = 1;

            const pageResults = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64Image = file.buffer.toString('base64');
                const mimeType = normalizeUploadedMimeType(file.mimetype);

                const parseResult = await parseMenuImageWithFallback({
                    base64Image,
                    mimeType,
                    targetLang,
                    requestId: `${req.requestId}-p${i + 1}`
                });

                pageResults.push(parseResult);

                if (!determinedSourceLanguage && parseResult.aiResponse) {
                    determinedSourceLanguage = parseResult.aiResponse.sourceLanguage
                        || inferSourceLanguage(parseResult.aiResponse.items || []);
                }

                if (!determinedOriginalCurrency) {
                    const inferredCurrency = inferCurrencyFromText(JSON.stringify({
                        originalCurrency: parseResult.aiResponse && parseResult.aiResponse.originalCurrency,
                        items: (parseResult.aiResponse && parseResult.aiResponse.items || []).map(item => ({
                            originalPriceText: item && item.originalPriceText
                        }))
                    }));
                    determinedOriginalCurrency = resolveOriginalCurrency(
                        parseResult.aiResponse && parseResult.aiResponse.originalCurrency,
                        inferredCurrency,
                        targetCurrency
                    );
                }
            }

            if (!determinedOriginalCurrency) {
                determinedOriginalCurrency = targetCurrency;
            }

            try {
                exchangeRate = await resolveExchangeRate(determinedOriginalCurrency, targetCurrency);
            } catch (error) {
                console.warn('[exchange-rate:fallback]', {
                    requestId: req.requestId,
                    fromCurrency: determinedOriginalCurrency,
                    toCurrency: targetCurrency,
                    message: error && error.message
                });
                effectiveTargetCurrency = determinedOriginalCurrency;
                exchangeRate = 1;
            }

            const normalizedPageItems = pageResults.map(r => {
                const items = Array.isArray(r.aiResponse && r.aiResponse.items) ? r.aiResponse.items : [];
                return items.map((item, index) => normalizeParsedItem(item, index, exchangeRate, determinedOriginalCurrency));
            });

            const merged = mergeMenuResults(
                pageResults.map((r, i) => ({ ...r, _normalizedItems: normalizedPageItems[i] })),
                determinedOriginalCurrency,
                exchangeRate
            );

            const items = mergeMenuResults(
                pageResults.map(r => ({
                    ...r,
                    aiResponse: {
                        ...(r.aiResponse || {}),
                        items: Array.isArray(r.aiResponse && r.aiResponse.items)
                            ? r.aiResponse.items.map((item, idx) => normalizeParsedItem(item, idx, exchangeRate, determinedOriginalCurrency))
                            : [],
                        globalAddOns: r.aiResponse && r.aiResponse.globalAddOns || [],
                        globalDiscountRules: r.aiResponse && r.aiResponse.globalDiscountRules || []
                    }
                })),
                determinedOriginalCurrency,
                exchangeRate
            );

            const originalCurrencyMeta = {
                code: determinedOriginalCurrency,
                fractionDigits: getCurrencyFractionDigits(determinedOriginalCurrency)
            };
            const targetCurrencyCode = normalizeCurrencyCode(effectiveTargetCurrency);
            const targetCurrencyMeta = {
                code: targetCurrencyCode,
                fractionDigits: getCurrencyFractionDigits(targetCurrencyCode)
            };

            res.json({
                sourceLanguage: determinedSourceLanguage || 'en',
                originalCurrency: determinedOriginalCurrency,
                targetCurrency: effectiveTargetCurrency,
                originalCurrencyMeta,
                targetCurrencyMeta,
                exchangeRate,
                globalPromotionText: items.globalPromotionText,
                globalAddOns: items.globalAddOns,
                globalDiscountRules: items.globalDiscountRules,
                parseStrategy: items.parseStrategy,
                parseWarnings: items.parseWarnings,
                items: items.items,
                pageCount: files.length
            });

            console.log('[menu-parse-multi:done]', {
                requestId: req.requestId,
                durationMs: Date.now() - requestStartedAt,
                pageCount: files.length,
                parseStrategy: items.parseStrategy,
                itemCount: items.items.length
            });

        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
