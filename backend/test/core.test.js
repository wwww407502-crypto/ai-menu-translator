const { describe, it } = require('node:test');
const assert = require('node:assert');

const { toTrimmedString, toOptionalString, toOptionalNumber, toOptionalPriceNumber, roundPrice, convertPrice, parsePositiveInteger, parseChinesePositiveInteger, ensureUniqueById, countPriceTextMatches } = require('../lib/utils');
const { parsePriceText, resolvePriceValue, isSuspiciousWesternIntegerPrice, shouldPreferInferredPrices, maybeRestoreDecimalPrice } = require('../lib/price');
const { normalizeCurrencyCode, getCurrencyMeta, getCurrencyFractionDigits, isSupportedCurrency, isWesternDecimalCurrency, resolveOriginalCurrency, inferCurrencyFromText } = require('../lib/currency');
const { normalizeDiscountPercent, normalizeDiscountRuleType, inferDiscountRuleType, normalizeDiscountRule } = require('../lib/discount');
const { inferSourceLanguage, inferSourceLanguageFromText } = require('../lib/language');
const { ensureAllowedTargetLanguage } = require('../lib/validators');
const { extractItemsFromText, extractCurrencyFromRawText } = require('../lib/degraded-extractor');

describe('utils', () => {
    describe('toTrimmedString', () => {
        it('trims whitespace', () => {
            assert.strictEqual(toTrimmedString('  hello  '), 'hello');
        });
        it('returns empty string for non-string', () => {
            assert.strictEqual(toTrimmedString(null), '');
            assert.strictEqual(toTrimmedString(undefined), '');
            assert.strictEqual(toTrimmedString(123), '');
        });
    });

    describe('toOptionalPriceNumber', () => {
        it('parses standard numbers', () => {
            assert.strictEqual(toOptionalPriceNumber('3.50'), 3.50);
            assert.strictEqual(toOptionalPriceNumber('14.00'), 14.00);
            assert.strictEqual(toOptionalPriceNumber(9.50), 9.50);
        });
        it('handles comma-separated thousands', () => {
            assert.strictEqual(toOptionalPriceNumber('1,234.56'), 1234.56);
            assert.strictEqual(toOptionalPriceNumber('1,000'), 1000);
        });
        it('returns null for non-numbers', () => {
            assert.strictEqual(toOptionalPriceNumber('N/A'), null);
            assert.strictEqual(toOptionalPriceNumber(''), null);
        });
        it('extracts number from mixed text', () => {
            assert.strictEqual(toOptionalPriceNumber('$3.50'), 3.50);
        });
    });

    describe('roundPrice', () => {
        it('rounds to 2 digits by default', () => {
            assert.strictEqual(roundPrice(3.456), 3.46);
            assert.strictEqual(roundPrice(3.451), 3.45);
        });
        it('rounds to specified digits', () => {
            assert.strictEqual(roundPrice(3.456, 0), 3);
            assert.strictEqual(roundPrice(3.456, 1), 3.5);
        });
        it('handles zero', () => {
            assert.strictEqual(roundPrice(0), 0);
            assert.strictEqual(roundPrice(null), 0);
        });
    });

    describe('convertPrice', () => {
        it('converts with exchange rate', () => {
            assert.strictEqual(convertPrice(10, 7.2), 72);
            assert.strictEqual(convertPrice(100, 0.048), 4.8);
        });
    });

    describe('parsePositiveInteger', () => {
        it('parses arabic numbers', () => {
            assert.strictEqual(parsePositiveInteger('5'), 5);
            assert.strictEqual(parsePositiveInteger(3), 3);
        });
        it('parses Chinese digits', () => {
            assert.strictEqual(parsePositiveInteger('一'), 1);
            assert.strictEqual(parsePositiveInteger('五'), 5);
            assert.strictEqual(parsePositiveInteger('九'), 9);
            assert.strictEqual(parsePositiveInteger('十'), 10);
        });
        it('parses Chinese compound numbers', () => {
            assert.strictEqual(parsePositiveInteger('十二'), 12);
            assert.strictEqual(parsePositiveInteger('三十五'), 35);
            assert.strictEqual(parsePositiveInteger('二十'), 20);
            assert.strictEqual(parsePositiveInteger('二十一'), 21);
            assert.strictEqual(parsePositiveInteger('十一'), 11);
        });
        it('parses Chinese hundred numbers', () => {
            assert.strictEqual(parsePositiveInteger('一百'), 100);
            assert.strictEqual(parsePositiveInteger('三百'), 300);
            assert.strictEqual(parsePositiveInteger('一百二十'), 120);
            assert.strictEqual(parsePositiveInteger('二百五十'), 250);
            assert.strictEqual(parsePositiveInteger('三百零五'), 305);
        });
        it('parses Chinese "两" as 2', () => {
            assert.strictEqual(parsePositiveInteger('两'), 2);
            assert.strictEqual(parsePositiveInteger('兩'), 2);
        });
        it('returns null for invalid input', () => {
            assert.strictEqual(parsePositiveInteger('hello'), null);
            assert.strictEqual(parsePositiveInteger(''), null);
            assert.strictEqual(parsePositiveInteger(0), null);
            assert.strictEqual(parsePositiveInteger(-1), null);
        });
        it('extracts digits from mixed text', () => {
            assert.strictEqual(parsePositiveInteger('买3送1'), 3);
        });
    });

    describe('ensureUniqueById', () => {
        it('deduplicates by id', () => {
            const items = [
                { id: 'a', value: 1 },
                { id: 'b', value: 2 },
                { id: 'a', value: 3 }
            ];
            const result = ensureUniqueById(items);
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].value, 1);
            assert.strictEqual(result[1].value, 2);
        });
    });
});

describe('degraded-extractor', () => {
    describe('extractItemsFromText', () => {
        it('extracts name-price pairs from simple text', () => {
            const text = 'Ramen 850\nCurry 700\nSushi 1200';
            const items = extractItemsFromText(text);
            assert.ok(items.length >= 2);
            assert.strictEqual(items[0].originalName, 'Ramen');
            assert.strictEqual(items[0].originalPrice, 850);
        });

        it('extracts items with currency symbols', () => {
            const text = 'Burger $12.50\nFries $4.00\nSoda $2.50';
            const items = extractItemsFromText(text);
            assert.ok(items.length >= 2);
            assert.strictEqual(items[0].originalPrice, 12.50);
        });

        it('extracts items with yen prices', () => {
            const text = 'ラーメン 850円\nカレー 700円\n寿司 1200円';
            const items = extractItemsFromText(text);
            assert.ok(items.length >= 2);
            assert.strictEqual(items[0].originalPrice, 850);
        });

        it('skips header and total lines', () => {
            const text = 'Menu\n---\nRamen 850\nTotal 2550';
            const items = extractItemsFromText(text);
            const names = items.map(i => i.originalName);
            assert.ok(!names.includes('Menu'));
            assert.ok(!names.includes('Total'));
        });

        it('returns empty array for empty text', () => {
            assert.strictEqual(extractItemsFromText('').length, 0);
            assert.strictEqual(extractItemsFromText(null).length, 0);
        });

        it('handles comma-separated prices', () => {
            const text = 'Kimchi 12,000\nBibimbap 8,500';
            const items = extractItemsFromText(text);
            assert.strictEqual(items[0].originalPrice, 12000);
        });

        it('extracts Chinese menu items', () => {
            const text = '红烧牛肉面 38\n宫保鸡丁 42\n酸辣汤 18';
            const items = extractItemsFromText(text);
            assert.ok(items.length >= 2);
        });
    });

    describe('extractCurrencyFromRawText', () => {
        it('detects USD from $ symbol', () => {
            assert.strictEqual(extractCurrencyFromRawText('Burger $12.50'), 'USD');
        });

        it('detects JPY from yen symbol', () => {
            assert.strictEqual(extractCurrencyFromRawText('ラーメン ¥850'), 'JPY');
        });

        it('detects EUR from € symbol', () => {
            assert.strictEqual(extractCurrencyFromRawText('Pasta €8.00'), 'EUR');
        });

        it('returns unknown for unrecognized text', () => {
            assert.strictEqual(extractCurrencyFromRawText(''), 'unknown');
        });
    });
});

describe('currency', () => {
    describe('normalizeCurrencyCode', () => {
        it('uppercases and trims', () => {
            assert.strictEqual(normalizeCurrencyCode('usd'), 'USD');
            assert.strictEqual(normalizeCurrencyCode('  cny  '), 'CNY');
        });
    });

    describe('getCurrencyMeta / getCurrencyFractionDigits', () => {
        it('returns correct fraction digits', () => {
            assert.strictEqual(getCurrencyFractionDigits('JPY'), 0);
            assert.strictEqual(getCurrencyFractionDigits('CNY'), 2);
            assert.strictEqual(getCurrencyFractionDigits('USD'), 2);
            assert.strictEqual(getCurrencyFractionDigits('KRW'), 0);
        });
    });

    describe('isSupportedCurrency', () => {
        it('recognizes valid currencies', () => {
            assert.strictEqual(isSupportedCurrency('USD'), true);
            assert.strictEqual(isSupportedCurrency('CNY'), true);
            assert.strictEqual(isSupportedCurrency('JPY'), true);
        });
        it('rejects invalid currencies', () => {
            assert.strictEqual(isSupportedCurrency('XYZ'), false);
            assert.strictEqual(isSupportedCurrency(''), false);
        });
    });

    describe('isWesternDecimalCurrency', () => {
        it('identifies western currencies', () => {
            assert.strictEqual(isWesternDecimalCurrency('USD'), true);
            assert.strictEqual(isWesternDecimalCurrency('EUR'), true);
            assert.strictEqual(isWesternDecimalCurrency('GBP'), true);
        });
        it('rejects non-western currencies', () => {
            assert.strictEqual(isWesternDecimalCurrency('JPY'), false);
            assert.strictEqual(isWesternDecimalCurrency('CNY'), false);
        });
    });

    describe('resolveOriginalCurrency', () => {
        it('returns first valid candidate', () => {
            assert.strictEqual(resolveOriginalCurrency('USD', 'CNY'), 'USD');
            assert.strictEqual(resolveOriginalCurrency('XYZ', 'CNY'), 'CNY');
            assert.strictEqual(resolveOriginalCurrency('XYZ', 'ABC', 'JPY'), 'JPY');
            assert.strictEqual(resolveOriginalCurrency('XYZ'), null);
        });
    });

    describe('inferCurrencyFromText', () => {
        it('infers from symbols', () => {
            assert.strictEqual(inferCurrencyFromText('$3.50'), 'USD');
            assert.strictEqual(inferCurrencyFromText('€5.00'), 'EUR');
            assert.strictEqual(inferCurrencyFromText('¥1000'), 'JPY');
        });
        it('infers from code', () => {
            assert.strictEqual(inferCurrencyFromText('price: 50 USD'), 'USD');
        });
        it('returns unknown for unrecognized', () => {
            assert.strictEqual(inferCurrencyFromText(''), 'unknown');
        });
    });
});

describe('price', () => {
    describe('parsePriceText', () => {
        it('parses simple dollar amount', () => {
            const result = parsePriceText('$3.50', 'USD');
            assert.strictEqual(result, 3.50);
        });
        it('parses dollar amount without symbol', () => {
            assert.strictEqual(parsePriceText('14.00', 'USD'), 14.00);
        });
        it('parses yen amount (no decimals)', () => {
            const result = parsePriceText('¥500', 'JPY');
            assert.strictEqual(result, 500);
        });
        it('parses CNY amount', () => {
            assert.strictEqual(parsePriceText('￥25.00', 'CNY'), 25);
        });
        it('parses KRW amount', () => {
            assert.strictEqual(parsePriceText('12,000', 'KRW'), 12000);
        });
        it('returns null for non-price text', () => {
            assert.strictEqual(parsePriceText('Large', 'USD'), null);
            assert.strictEqual(parsePriceText('3 pieces', 'USD'), null);
            assert.strictEqual(parsePriceText('', 'USD'), null);
        });
    });

    describe('resolvePriceValue', () => {
        it('prefers parsed raw text over numeric', () => {
            assert.strictEqual(resolvePriceValue('$3.50', 999, 'USD'), 3.50);
        });
        it('falls back to numeric value', () => {
            assert.strictEqual(resolvePriceValue(null, 3.50, 'USD'), 3.50);
        });
        it('restores decimal for suspicious western integer', () => {
            const result = resolvePriceValue(null, 350, 'USD', '$3.50');
            assert.strictEqual(result, 3.50);
        });
        it('returns null when both are null', () => {
            assert.strictEqual(resolvePriceValue(null, null, 'USD'), null);
        });
    });

    describe('isSuspiciousWesternIntegerPrice', () => {
        it('flags integer >= 100 in western currency', () => {
            assert.strictEqual(isSuspiciousWesternIntegerPrice(350, 'USD'), true);
            assert.strictEqual(isSuspiciousWesternIntegerPrice(1000, 'EUR'), true);
        });
        it('ignores small integers', () => {
            assert.strictEqual(isSuspiciousWesternIntegerPrice(5, 'USD'), false);
            assert.strictEqual(isSuspiciousWesternIntegerPrice(99, 'USD'), false);
        });
        it('ignores non-western currencies', () => {
            assert.strictEqual(isSuspiciousWesternIntegerPrice(350, 'JPY'), false);
            assert.strictEqual(isSuspiciousWesternIntegerPrice(350, 'CNY'), false);
        });
        it('ignores non-integers', () => {
            assert.strictEqual(isSuspiciousWesternIntegerPrice(3.50, 'USD'), false);
        });
    });

    describe('shouldPreferInferredPrices', () => {
        it('prefers inferred when explicit are all suspicious integers', () => {
            const explicitItems = [{ originalPrice: 350 }, { originalPrice: 950 }];
            const inferredItems = [{ originalPrice: 3.50 }];
            assert.strictEqual(shouldPreferInferredPrices(explicitItems, inferredItems, 'USD'), true);
        });
        it('does not prefer when explicit has decimal prices', () => {
            const explicitItems = [{ originalPrice: 3.50 }, { originalPrice: 9.50 }];
            const inferredItems = [{ originalPrice: 3.50 }];
            assert.strictEqual(shouldPreferInferredPrices(explicitItems, inferredItems, 'USD'), false);
        });
    });

    describe('maybeRestoreDecimalPrice', () => {
        it('restores $3.50 from 350', () => {
            assert.strictEqual(maybeRestoreDecimalPrice(350, '$3.50', 'USD'), 3.50);
        });
        it('divides by 100 when no matching candidate', () => {
            const result = maybeRestoreDecimalPrice(950, 'no decimal text', 'USD');
            assert.strictEqual(result, 9.50);
        });
    });
});

describe('discount', () => {
    describe('normalizeDiscountPercent', () => {
        it('converts decimal to percentage', () => {
            assert.strictEqual(normalizeDiscountPercent(0.2), 20);
            assert.strictEqual(normalizeDiscountPercent(0.5), 50);
        });
        it('keeps percentage values as-is', () => {
            assert.strictEqual(normalizeDiscountPercent(20), 20);
            assert.strictEqual(normalizeDiscountPercent(50), 50);
        });
        it('rejects invalid values', () => {
            assert.strictEqual(normalizeDiscountPercent(0), null);
            assert.strictEqual(normalizeDiscountPercent(-10), null);
            assert.strictEqual(normalizeDiscountPercent(150), null);
        });
    });

    describe('inferDiscountRuleType', () => {
        it('detects buy_x_get_y', () => {
            assert.strictEqual(inferDiscountRuleType('买2送1'), 'buy_x_get_y');
            assert.strictEqual(inferDiscountRuleType('buy 3 get 1 free'), 'buy_x_get_y');
        });
        it('detects nth_item_discount', () => {
            assert.strictEqual(inferDiscountRuleType('第二件半价'), 'nth_item_discount');
            assert.strictEqual(inferDiscountRuleType('2nd item half price'), 'nth_item_discount');
        });
        it('detects percentage_discount', () => {
            assert.strictEqual(inferDiscountRuleType('20% off'), 'percentage_discount');
            assert.strictEqual(inferDiscountRuleType('8折'), 'percentage_discount');
        });
        it('detects amount_off', () => {
            assert.strictEqual(inferDiscountRuleType('满100减20'), 'amount_off');
            assert.strictEqual(inferDiscountRuleType('10 off'), 'amount_off');
        });
        it('detects bundle_price', () => {
            assert.strictEqual(inferDiscountRuleType('3 for $10'), 'bundle_price');
        });
    });

    describe('normalizeDiscountRuleType', () => {
        it('resolves aliases', () => {
            assert.strictEqual(normalizeDiscountRuleType('bogo', ''), 'buy_x_get_y');
            assert.strictEqual(normalizeDiscountRuleType('second_half_price', ''), 'nth_item_discount');
            assert.strictEqual(normalizeDiscountRuleType('percent_off', ''), 'percentage_discount');
            assert.strictEqual(normalizeDiscountRuleType('money_off', ''), 'amount_off');
        });
    });

    describe('normalizeDiscountRule', () => {
        it('normalizes a buy_x_get_y rule', () => {
            const rule = normalizeDiscountRule(
                { type: 'buy_x_get_y', minQuantity: 2, freeQuantity: 1, originalLabel: 'Buy 2 get 1' },
                0, 7.2, 'USD'
            );
            assert.strictEqual(rule.type, 'buy_x_get_y');
            assert.strictEqual(rule.minQuantity, 2);
            assert.strictEqual(rule.freeQuantity, 1);
        });

        it('returns null for empty rule', () => {
            const rule = normalizeDiscountRule(
                { type: '', originalLabel: null }, 0, 1, 'USD'
            );
            assert.strictEqual(rule, null);
        });
    });
});

describe('language', () => {
    describe('inferSourceLanguage', () => {
        it('detects Japanese', () => {
            assert.strictEqual(inferSourceLanguage([{ originalName: 'ラーメン' }]), 'ja');
        });
        it('detects Korean', () => {
            assert.strictEqual(inferSourceLanguage([{ originalName: '김치찌개' }]), 'ko');
        });
        it('detects Chinese', () => {
            assert.strictEqual(inferSourceLanguage([{ originalName: '红烧牛肉面' }]), 'zh-CN');
        });
        it('detects English', () => {
            assert.strictEqual(inferSourceLanguage([{ originalName: 'Burger' }]), 'en');
        });
    });

    describe('inferSourceLanguageFromText', () => {
        it('returns unknown for empty text', () => {
            assert.strictEqual(inferSourceLanguageFromText(''), 'unknown');
        });
    });
});

describe('validators', () => {
    describe('ensureAllowedTargetLanguage', () => {
        it('returns valid language', () => {
            assert.strictEqual(ensureAllowedTargetLanguage('zh-CN'), 'zh-CN');
            assert.strictEqual(ensureAllowedTargetLanguage('en'), 'en');
            assert.strictEqual(ensureAllowedTargetLanguage('ja'), 'ja');
        });
        it('throws for invalid language', () => {
            assert.throws(() => ensureAllowedTargetLanguage('xx'), /Unsupported targetLang/);
        });
    });
});
