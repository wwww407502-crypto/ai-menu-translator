const { toTrimmedString, toOptionalPriceNumber } = require('./utils');
const { inferCurrencyFromText } = require('./currency');
const { currencyCodePattern } = require('../config');
const { CURRENCY_CODES } = require('../shared/currency-data');

const itemLinePatterns = [
    new RegExp(
        `^(.{2,60}?)\\s+` +
        `(?:(?:${CURRENCY_CODES.join('|')})\\s*)?` +
        `[$€£¥￥₩]?\\s*(\\d[\\d.,]+)` +
        `\\s*(?:円|ドル|元|usd|eur|gbp|aud|nzd|cad)?` +
        `$`,
        'i'
    ),
    new RegExp(
        `^(.{2,40}?)\\s+` +
        `(\\d[\\d.,]+)` +
        `\\s*(?:円|元|ドル|[$€£¥￥₩])` +
        `$`,
        'i'
    ),
    new RegExp(
        `^(.{2,40}?)\\s*[:：]\\s*` +
        `[$€£¥￥₩]?\\s*(\\d[\\d.,]+)` +
        `$`,
        'i'
    )
];

const priceBeforeNamePattern = new RegExp(
    `[$€£¥￥₩]?\\s*(\\d[\\d.,]+)\\s*(?:円|ドル|元)?\\s+(.{2,40}?)$`,
    'i'
);

const categoryHeaderPattern = /^(?:Category|类别|カテゴリ|カテゴリー|분류|分类)\s*[:：]?\s*(.+)$/i;
const bulletPattern = /^[-•·\s]*/;

function cleanItemName(text) {
    return text
        .replace(bulletPattern, '')
        .replace(/^\d+[.)、]\s*/, '')
        .replace(/^[-•·]?\s*/, '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 80);
}

function isLikelyItemLine(line) {
    const normalized = toTrimmedString(line);
    if (!normalized || normalized.length < 3) return false;
    if (normalized.length > 120) return false;
    if (/^(?:menu|メニュー|菜单|菜單|메뉴|sub\s*total|total|合计|合計|tax|税|taxes|service|服务费|チップ|小计|小計|order|ご注文)/i.test(normalized)) {
        return false;
    }
    if (/^[A-Z0-9\s]{1,5}$/.test(normalized) && normalized.length < 6) return false;
    return true;
}

function isLikelyCategoryLine(line) {
    return categoryHeaderPattern.test(toTrimmedString(line));
}

function extractCategory(line) {
    const match = toTrimmedString(line).match(categoryHeaderPattern);
    return match ? match[1].slice(0, 32) : null;
}

function extractItemsFromText(rawText = '') {
    const text = toTrimmedString(rawText);
    if (!text) return [];

    const lines = text.split(/\n|\r\n/).map(toTrimmedString).filter(Boolean);
    const items = [];
    let currentCategory = null;

    for (const line of lines) {
        if (!isLikelyItemLine(line)) continue;
        if (isLikelyCategoryLine(line)) {
            currentCategory = extractCategory(line);
            continue;
        }

        let matched = false;
        for (const pattern of itemLinePatterns) {
            const match = line.match(pattern);
            if (match) {
                const name = cleanItemName(match[1]);
                const price = toOptionalPriceNumber(match[2]);
                if (name && price !== null) {
                    items.push({
                        originalName: name,
                        translatedName: name,
                        category: currentCategory || 'Other',
                        itemType: 'single',
                        originalPriceText: match[2],
                        originalPrice: price,
                        parseMode: 'partial',
                        parseStrategy: 'degraded'
                    });
                    matched = true;
                    break;
                }
            }
        }

        if (!matched) {
            const priceFirstMatch = line.match(priceBeforeNamePattern);
            if (priceFirstMatch) {
                const price = toOptionalPriceNumber(priceFirstMatch[1]);
                const name = cleanItemName(priceFirstMatch[2]);
                if (name && price !== null) {
                    items.push({
                        originalName: name,
                        translatedName: name,
                        category: currentCategory || 'Other',
                        itemType: 'single',
                        originalPriceText: priceFirstMatch[1],
                        originalPrice: price,
                        parseMode: 'partial',
                        parseStrategy: 'degraded'
                    });
                }
                continue;
            }

            const genericPriceMatch = line.match(
                new RegExp(`[$€£¥￥₩]?\\s*(\\d[\\d.,]+)\\s*(?:円|ドル|元)?`, 'g')
            );
            if (genericPriceMatch) {
                const lastName = line;
                for (const pm of genericPriceMatch) {
                    const price = toOptionalPriceNumber(pm);
                    const namePortion = lastName.split(pm)[0] || lastName;
                    const name = cleanItemName(namePortion);
                    if (name && price !== null && name.length >= 2) {
                        items.push({
                            originalName: name,
                            translatedName: name,
                            category: currentCategory || 'Other',
                            itemType: 'single',
                            originalPriceText: pm,
                            originalPrice: price,
                            parseMode: 'partial',
                            parseStrategy: 'degraded'
                        });
                        break;
                    }
                }
            }
        }
    }

    return items;
}

function extractCurrencyFromRawText(rawText = '') {
    const text = toTrimmedString(rawText);
    if (!text) return 'unknown';

    const inferred = inferCurrencyFromText(text);
    if (inferred !== 'unknown') return inferred;

    const lines = text.split(/\n|\r\n/).map(toTrimmedString).filter(Boolean);
    const priceFields = [];
    for (const line of lines) {
        const match = line.match(new RegExp(`\\b(?:${CURRENCY_CODES.join('|')})\\b`, 'i'));
        if (match) priceFields.push(match[0].toUpperCase());
    }
    for (const code of priceFields) {
        const currency = inferCurrencyFromText(code);
        if (currency !== 'unknown') return currency;
    }

    const symbols = { '¥': 'JPY', '￥': 'CNY', '$': 'USD', '€': 'EUR', '£': 'GBP', '₩': 'KRW' };
    for (const checkLine of lines.slice(0, 5)) {
        for (const [symbol, code] of Object.entries(symbols)) {
            if (checkLine.includes(symbol)) return code;
        }
    }

    return 'unknown';
}

module.exports = {
    extractItemsFromText,
    extractCurrencyFromRawText,
    isLikelyItemLine
};
