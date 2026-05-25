const { requestJsonCompletion, requestTextCompletionSafe } = require('./ai');
const {
    visionModel,
    parseEnableThinking,
    parseThinkingBudget,
    modelMaxTokens,
    directParseTimeoutMs
} = require('../config');
const { extractItemsFromText, extractCurrencyFromRawText } = require('../lib/degraded-extractor');

function buildDirectParseMessages(base64Image, mimeType, targetLang) {
    return [
        {
            role: 'system',
            content: `You are a menu OCR and structuring engine. Parse the menu image into a precise JSON object.

=== CRITICAL RULES ===
1. NEVER invent information. If you cannot read something, omit that field rather than guessing.
2. ALWAYS copy the exact price text from the menu into "originalPriceText". Keep symbols and decimals exactly as printed: "$3.50", "¥480", "1,200", "€8.90".
3. The numeric "originalPrice" field must match originalPriceText. $3.50 = 3.50, never 350.
4. Put any promotion text you cannot fully structure into "rawPromotionText". This text will be parsed by a secondary rule engine.
5. Return ONLY a valid JSON object. No markdown wrapping, no comments, no trailing commas.

=== JSON SCHEMA (every field type shown below) ===
{
  "sourceLanguage": "ja",
  "originalCurrency": "JPY",
  "globalPromotionText": "The raw footer/global promotion text exactly as printed, if present",
  "globalAddOns": [
    {
      "id": "addon-a",
      "originalLabel": "ももザンギ追加",
      "translatedLabel": "Add fried chicken thigh",
      "originalPriceDeltaText": "+220",
      "originalPriceDelta": 220,
      "required": false,
      "note": null
    }
  ],
  "globalDiscountRules": [
    {
      "id": "rule-1",
      "type": "buy_x_get_y",
      "originalLabel": "買3送1",
      "translatedLabel": "Buy 3 get 1 free",
      "rawRuleText": "買3送1",
      "minQuantity": 3,
      "paidQuantity": 3,
      "freeQuantity": 1
    }
  ],
  "items": [
    {
      "category": "Starters",
      "originalName": "たこ焼き",
      "translatedName": "Takoyaki",
      "itemType": "tiered",
      "originalPriceText": null,
      "originalPrice": null,
      "tiers": [
        {
          "id": "tier-3",
          "label": "3個",
          "originalLabel": "3個",
          "translatedLabel": "3 pieces",
          "quantity": 3,
          "originalPriceText": "660円",
          "originalPrice": 660
        },
        {
          "id": "tier-6",
          "label": "6個",
          "originalLabel": "6個",
          "translatedLabel": "6 pieces",
          "quantity": 6,
          "originalPriceText": "1,300円",
          "originalPrice": 1300
        }
      ],
      "bundleItems": [],
      "addOns": [],
      "bonusItems": [],
      "discountRules": [],
      "promotionSummary": "3 pieces 660 yen, 6 pieces 1300 yen",
      "rawPromotionText": "3個 660円 / 6個 1,300円",
      "parseMode": "structured"
    },
    {
      "category": "Combos",
      "originalName": "10個セット",
      "translatedName": "10-Piece Set",
      "itemType": "bundle",
      "originalPriceText": "1,600円",
      "originalPrice": 1600,
      "tiers": [],
      "bundleItems": [
        {
          "originalName": "たこ焼き",
          "translatedName": "Takoyaki",
          "quantity": 10,
          "note": null
        },
        {
          "originalName": "ドリンク",
          "translatedName": "Drink",
          "quantity": 1,
          "note": null
        }
      ],
      "addOns": [
        {
          "id": "addon-1",
          "originalLabel": "+200円でポテト追加",
          "translatedLabel": "Add fries +200 yen",
          "originalPriceDeltaText": "+200",
          "originalPriceDelta": 200,
          "required": false,
          "note": null
        }
      ],
      "bonusItems": [
        {
          "originalLabel": "ポテト",
          "translatedLabel": "Fries",
          "quantity": 1,
          "note": null
        }
      ],
      "discountRules": [],
      "promotionSummary": "10 takoyaki + 1 drink + bonus fries, 1600 yen",
      "rawPromotionText": "10個セット 1,600円 / +200円でポテト追加",
      "parseMode": "structured"
    },
    {
      "category": "Drinks",
      "originalName": "生ビール",
      "translatedName": "Draft Beer",
      "itemType": "single",
      "originalPriceText": "500円",
      "originalPrice": 500,
      "tiers": [],
      "bundleItems": [],
      "addOns": [],
      "bonusItems": [],
      "discountRules": [],
      "promotionSummary": null,
      "rawPromotionText": null,
      "parseMode": "basic"
    }
  ]
}

=== FIELD REFERENCE ===

Every ITEM must have these top-level fields:
  category, originalName, translatedName, itemType, originalPriceText, originalPrice,
  tiers, bundleItems, addOns, bonusItems, discountRules,
  promotionSummary (null or short translated summary), rawPromotionText (null or raw original text),
  parseMode

itemType: "single" (no tiers/bundle), "tiered" (size/qty pricing with tiers array),
          "bundle" (combo/set/盛り合わせ with bundleItems array)

TIER fields: id, label, originalLabel, translatedLabel, quantity (number), originalPriceText, originalPrice

BUNDLEITEM fields: originalName, translatedName, quantity, note

ADDON fields: id, originalLabel, translatedLabel, originalPriceDeltaText, originalPriceDelta, required (boolean), note

BONUSITEM fields: originalLabel, translatedLabel, quantity, note

DISCOUNTRULE fields:
  id, type (one of: bundle_price, buy_x_get_y, nth_item_discount, percentage_discount, amount_off, raw),
  originalLabel, translatedLabel, rawRuleText (the original text from the menu),
  minQuantity, paidQuantity, freeQuantity, appliesToQuantity,
  minSpendText (raw text), minSpend (number),
  originalPriceText, originalPrice,
  discountAmountText, discountAmount,
  discountPercent (number, e.g. 20 means 20% off),
  note

GLOBALADDON: same fields as ADDON

GLOBALDISCOUNTRULE: same fields as DISCOUNTRULE

=== MODE RULES ===
parseMode = "basic":    plain single item, no tiers/addons/discounts/bundle
parseMode = "structured": fully parsed tiers/addons/bundle/discounts into arrays
parseMode = "partial":   you found promotion text but could not fully structure it — put the raw text in rawPromotionText

=== COMMON MISTAKES TO AVOID ===
- DO NOT turn $3.50 into 350. Keep the decimal point.
- DO NOT wrap the JSON in \`\`\`json markers.
- DO NOT use field names like "price", "name", "translatedPrice", "tierOptions". Use ONLY the field names shown above.
- DO NOT put price in "promotionSummary". That field is a short human-readable label.
- DO put the original untranslated promotion text in "rawPromotionText" so rules can be extracted later.
- DO include ALL visible items. Missing items are worse than wrong details.
- For items with multiple size options (S/M/L) at different prices, use itemType="tiered" with one tier per option.
- For combo deals (set meal, 套餐, セット, mixed platter, 盛り合わせ), use itemType="bundle" with bundleItems.

=== LANGUAGE DETECTION ===
sourceLanguage must be a BCP47 language tag:
  zh-CN, zh-TW, ja, ko, en, fr, de, es, pt, it, nl, pl, sv,
  ru (Cyrillic), ar (Arabic), th (Thai), vi (Vietnamese),
  id (Indonesian), ms (Malay), hi (Devanagari), bn (Bengali),
  tr (Turkish), fa (Persian), fil (Filipino)`
        },
        {
            role: 'user',
            content: [
                { type: 'text', text: `Parse this menu image into JSON. Translate all names, categories, labels and summaries to ${targetLang}. Return ONLY the JSON object, no markdown.` },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                    }
                }
            ]
        }
    ];
}

function buildHighQualityParseMessages(base64Image, mimeType, targetLang) {
    return [
        {
            role: 'system',
            content: `You are a precise menu OCR engine operating in HIGH-QUALITY mode. Take extra care with every detail.

Parse this menu image into the exact JSON schema described below. You may take more time to be accurate — precision matters more than speed.

CRITICAL: Preserve decimal points exactly. $3.50 is 3.50, never 350. ¥480 is 480.

Return ONLY a valid JSON object with this structure:
{
  "sourceLanguage": "BCP47 tag",
  "originalCurrency": "ISO 4217 code",
  "globalPromotionText": null,
  "globalAddOns": [],
  "globalDiscountRules": [],
  "items": [
    {
      "category": "Category name",
      "originalName": "Exact menu name",
      "translatedName": "Translated name",
      "itemType": "single | tiered | bundle",
      "originalPriceText": "$14.00 or 480円 or null for tiered items",
      "originalPrice": 14.00 or null for tiered items,
      "tiers": [{"id":"t-1","label":"Small","originalLabel":"S","translatedLabel":"Small","quantity":1,"originalPriceText":"$8.00","originalPrice":8.00}],
      "bundleItems": [{"originalName":"Item in set","translatedName":"Translated","quantity":1,"note":null}],
      "addOns": [{"id":"ao-1","originalLabel":"+$2 cheese","translatedLabel":"Add cheese","originalPriceDeltaText":"+$2","originalPriceDelta":2,"required":false,"note":null}],
      "bonusItems": [{"originalLabel":"Free fries","translatedLabel":"Free fries","quantity":1,"note":null}],
      "discountRules": [{"id":"d-1","type":"buy_x_get_y","originalLabel":"Buy 2 get 1","translatedLabel":"Buy 2 get 1","rawRuleText":"Buy 2 get 1 free","minQuantity":2,"paidQuantity":2,"freeQuantity":1}],
      "promotionSummary": "Brief translated summary or null",
      "rawPromotionText": "Original promotion text from menu or null",
      "parseMode": "basic | structured | partial"
    }
  ]
}

For tiered items: set originalPriceText and originalPrice to null on the item itself, and put pricing inside each tier.
For bundle items: include originalPriceText and originalPrice on the item itself.
For items with combo/set keywords (セット, 套餐, combo, set meal): use itemType="bundle".
Always include rawPromotionText with the original menu text whenever there are visible promotions.`
        },
        {
            role: 'user',
            content: [
                { type: 'text', text: `Parse this menu with HIGH precision. Translate all text to ${targetLang}. Look carefully for multi-tier pricing, bundle deals, add-ons, and discount rules.` },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                    }
                }
            ]
        }
    ];
}

function buildSimplifiedParseMessages(base64Image, mimeType, targetLang) {
    return [
        {
            role: 'system',
            content: `Parse this menu image. Return ONLY a JSON object with items array.
Each item MUST have: originalName, translatedName (in ${targetLang}), originalPriceText (raw price exactly as printed), originalPrice (number).
Preserve decimal points: $3.50 is 3.50 not 350. 9.50 is 9.50 not 950.
Also include: sourceLanguage, originalCurrency.
Return exactly: {"sourceLanguage":"...","originalCurrency":"...","items":[{"originalName":"...","translatedName":"...","originalPriceText":"$3.50","originalPrice":3.50}]}`
        },
        {
            role: 'user',
            content: [
                { type: 'text', text: `List every menu item with name and price. Translate names to ${targetLang}.` },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                    }
                }
            ]
        }
    ];
}

async function parseMenuImageWithFallback({ base64Image, mimeType, targetLang, requestId }) {
    const parseWarnings = [];

    const directResult = await requestTextCompletionSafe(
        buildDirectParseMessages(base64Image, mimeType, targetLang),
        {
            model: visionModel,
            enableThinking: parseEnableThinking,
            thinkingBudget: parseThinkingBudget,
            timeoutMs: directParseTimeoutMs,
            maxTokens: modelMaxTokens,
            requestId,
            debugLabel: 'menu_direct_parse'
        }
    );

    if (directResult.ok) {
        return {
            aiResponse: directResult.json,
            parseStrategy: 'direct',
            parseWarnings
        };
    }

    parseWarnings.push(
        directResult.upstreamError
            ? `Direct parse failed: ${directResult.upstreamError}`
            : `Direct JSON parse failed: ${directResult.parseError || 'unknown'}`
    );
    console.warn('[menu-parse:fallback]', {
        requestId,
        reason: parseWarnings[parseWarnings.length - 1],
        hasRawText: Boolean(directResult.rawText)
    });

    const simplifiedResult = await requestTextCompletionSafe(
        buildSimplifiedParseMessages(base64Image, mimeType, targetLang),
        {
            model: visionModel,
            timeoutMs: Math.floor(directParseTimeoutMs * 0.8),
            maxTokens: Math.floor(modelMaxTokens * 0.6),
            requestId,
            debugLabel: 'menu_simplified_retry'
        }
    );

    if (simplifiedResult.ok) {
        return {
            aiResponse: simplifiedResult.json,
            parseStrategy: 'retry',
            parseWarnings
        };
    }

    parseWarnings.push(
        simplifiedResult.upstreamError
            ? `Simplified retry failed: ${simplifiedResult.upstreamError}`
            : `Simplified JSON parse failed: ${simplifiedResult.parseError || 'unknown'}`
    );

    const rawTextForExtraction = directResult.rawText || simplifiedResult.rawText || '';
    if (rawTextForExtraction) {
        const degradedItems = extractItemsFromText(rawTextForExtraction);
        if (degradedItems.length) {
            const degradedCurrency = extractCurrencyFromRawText(rawTextForExtraction);
            parseWarnings.push(`Degraded to text extraction: ${degradedItems.length} items found`);
            console.warn('[menu-parse:degraded]', {
                requestId,
                itemCount: degradedItems.length,
                currency: degradedCurrency
            });
            return {
                aiResponse: {
                    sourceLanguage: 'unknown',
                    originalCurrency: degradedCurrency !== 'unknown' ? degradedCurrency : null,
                    globalPromotionText: null,
                    globalAddOns: [],
                    globalDiscountRules: [],
                    items: degradedItems
                },
                parseStrategy: 'degraded',
                parseWarnings
            };
        }

        parseWarnings.push('Degraded text extraction found no items');
    }

    return {
        aiResponse: {
            sourceLanguage: 'unknown',
            originalCurrency: null,
            globalPromotionText: null,
            globalAddOns: [],
            globalDiscountRules: [],
            items: []
        },
        parseStrategy: 'degraded',
        parseWarnings
    };
}

module.exports = {
    buildDirectParseMessages,
    buildHighQualityParseMessages,
    buildSimplifiedParseMessages,
    parseMenuImageWithFallback
};
