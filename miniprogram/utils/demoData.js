const demoResponse = {
  sourceLanguage: 'ja',
  originalCurrency: 'JPY',
  originalCurrencyMeta: { code: 'JPY', fractionDigits: 0 },
  targetCurrency: 'CNY',
  targetCurrencyMeta: { code: 'CNY', fractionDigits: 2 },
  exchangeRate: 0.049,
  globalPromotionText: '追加・ももザンギの追加 1ヶ 220円 / 手羽先ザンギの追加 1ヶ 200円 / タルタルソース 200円',
  globalAddOns: [
    {
      originalLabel: 'ももザンギの追加 1ヶ',
      translatedLabel: '腿肉炸鸡块加点 1个',
      originalPriceDelta: 220,
      convertedPriceDelta: 10.78
    },
    {
      originalLabel: '手羽先ザンギの追加 1ヶ',
      translatedLabel: '鸡翅炸鸡加点 1个',
      originalPriceDelta: 200,
      convertedPriceDelta: 9.8
    },
    {
      originalLabel: 'タルタルソース',
      translatedLabel: '塔塔酱',
      originalPriceDelta: 200,
      convertedPriceDelta: 9.8
    }
  ],
  items: [
    {
      category: '小吃',
      originalName: 'たこ焼き',
      translatedName: '章鱼烧',
      itemType: 'tiered',
      tiers: [
        {
          label: '3个装',
          originalLabel: '3個',
          translatedLabel: '3个装',
          quantity: 3,
          originalPrice: 660,
          convertedPrice: 32.34
        },
        {
          label: '6个装',
          originalLabel: '6個',
          translatedLabel: '6个装',
          quantity: 6,
          originalPrice: 1300,
          convertedPrice: 63.7
        },
        {
          label: '10个装',
          originalLabel: '10個',
          translatedLabel: '10个装',
          quantity: 10,
          originalPrice: 2130,
          convertedPrice: 104.37
        }
      ],
      promotionSummary: '支持多件优惠档位',
      rawPromotionText: '3個 660円 / 6個 1300円 / 10個 2130円',
      parseMode: 'structured'
    },
    {
      category: '套餐',
      originalName: '10個セット',
      translatedName: '10个套餐',
      itemType: 'bundle',
      originalPrice: 1600,
      convertedPrice: 78.4,
      bundleItems: [
        {
          originalName: 'たこ焼き',
          translatedName: '章鱼烧',
          quantity: 10
        },
        {
          originalName: 'ドリンク',
          translatedName: '饮料',
          quantity: 1
        }
      ],
      addOns: [
        {
          originalLabel: '＋200円でポテト追加',
          translatedLabel: '加 200 日元可加购薯条',
          originalPriceDelta: 200,
          convertedPriceDelta: 9.8
        }
      ],
      bonusItems: [
        {
          originalLabel: 'ポテト',
          translatedLabel: '薯条',
          quantity: 1
        }
      ],
      promotionSummary: '套餐含饮料，并支持加价加购',
      rawPromotionText: '10個セット 1600円、+200円でポテト追加',
      parseMode: 'structured'
    },
    {
      category: '饮品',
      originalName: '生ビール',
      translatedName: '生啤',
      originalPrice: 500,
      convertedPrice: 24.5
    }
  ]
};

module.exports = {
  demoResponse
};
