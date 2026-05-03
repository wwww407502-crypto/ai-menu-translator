const { normalizeLanguageTag } = require('./format');
const { CURRENCY_NAMES } = require('./currency-data');

const SUPPORTED_LANGUAGES = ['zh-CN', 'zh-TW', 'ja', 'ko', 'en'];

const SYSTEM_COPY = {
  'zh-CN': {
    appTitle: 'AI 菜单',
    menuTitle: '菜单',
    receiptTitle: '小票',
    takePhoto: '拍照识别',
    importAlbum: '相册导入',
    notice: '提示',
    processingEyebrow: '处理中',
    processingTitle: '正在解析菜单',
    processingDesc: '识别菜名、翻译语言并同步计算汇率',
    imageMissing: '没有获取到图片，请重试。',
    fallbackError: '后端解析失败，已载入演示菜单：',
    parseError: '服务器返回的数据格式不正确',
    uploadError: '图片上传失败',
    identifyMenu: '识别菜单',
    exchangeRate: '汇率',
    retry: '重新识别',
    currencySettings: '货币设置',
    currencySettingsHint: '统一设置菜单货币与兑换货币',
    sourceCurrency: '菜单货币',
    targetCurrency: '兑换货币',
    swapCurrencies: '交换货币',
    applyCurrencySettings: '应用设置',
    search: '搜索',
    collapseSearch: '收起搜索',
    searchPlaceholder: '搜索菜名、原文或分类',
    clear: '清空',
    backendHint: '后端提示',
    emptyItems: '没有匹配的菜品',
    dishCountSuffix: '道菜',
    total: '合计',
    generateReceipt: '生成小票',
    cartSummary: '购物车明细',
    cartSummaryHint: '按已选优惠档位、套餐和加购汇总',
    copyOrder: '复制订单',
    copied: '已复制',
    orderText: '点单内容',
    promotionSingle: '单品',
    promotionTiered: '优惠档位',
    promotionBundle: '套餐',
    promotionFallback: '原文规则',
    selectOption: '选择规格',
    addAnother: '再选一份',
    confirmSelection: '加入购物车',
    cancel: '取消',
    bundleIncludes: '套餐内容',
    addOnRule: '加购规则',
    bonusRule: '附赠内容',
    promotionSource: '优惠说明',
    globalAddOnRule: '全局加购',
    pendingRuleConfirmation: '规则待确认',
    selectedTier: '所选档位',
    selectedAddOns: '所选加购',
    finalAmount: '小计',
    unitPrice: '单价',
    priceFrom: '起',
    itemsUnit: '件',
    itemSingular: '件',
    itemPlural: '件'
  },
  'zh-TW': {
    appTitle: 'AI 菜單',
    menuTitle: '菜單',
    receiptTitle: '小票',
    takePhoto: '拍照辨識',
    importAlbum: '相簿匯入',
    notice: '提示',
    processingEyebrow: '處理中',
    processingTitle: '正在解析菜單',
    processingDesc: '辨識菜名、翻譯語言並同步計算匯率',
    imageMissing: '沒有取得圖片，請重試。',
    fallbackError: '後端解析失敗，已載入示範菜單：',
    parseError: '伺服器回傳的資料格式不正確',
    uploadError: '圖片上傳失敗',
    identifyMenu: '辨識菜單',
    exchangeRate: '匯率',
    retry: '重新辨識',
    currencySettings: '幣別設定',
    currencySettingsHint: '統一設定菜單幣別與兌換幣別',
    sourceCurrency: '菜單幣別',
    targetCurrency: '兌換幣別',
    swapCurrencies: '交換幣別',
    applyCurrencySettings: '套用設定',
    search: '搜尋',
    collapseSearch: '收起搜尋',
    searchPlaceholder: '搜尋菜名、原文或分類',
    clear: '清空',
    backendHint: '後端提示',
    emptyItems: '沒有符合的菜品',
    dishCountSuffix: '道菜',
    total: '合計',
    generateReceipt: '產生小票',
    cartSummary: '購物車明細',
    cartSummaryHint: '依已選優惠檔位、套餐與加購彙總',
    copyOrder: '複製訂單',
    copied: '已複製',
    orderText: '點單內容',
    promotionSingle: '單品',
    promotionTiered: '優惠檔位',
    promotionBundle: '套餐',
    promotionFallback: '原文規則',
    selectOption: '選擇規格',
    addAnother: '再選一份',
    confirmSelection: '加入購物車',
    cancel: '取消',
    bundleIncludes: '套餐內容',
    addOnRule: '加購規則',
    bonusRule: '附贈內容',
    promotionSource: '優惠說明',
    globalAddOnRule: '全域加購',
    pendingRuleConfirmation: '規則待確認',
    selectedTier: '所選檔位',
    selectedAddOns: '所選加購',
    finalAmount: '小計',
    unitPrice: '單價',
    priceFrom: '起',
    itemsUnit: '件',
    itemSingular: '件',
    itemPlural: '件'
  },
  ja: {
    appTitle: 'AIメニュー',
    menuTitle: 'メニュー',
    receiptTitle: '注文票',
    takePhoto: '写真で認識',
    importAlbum: 'アルバムから選択',
    notice: 'お知らせ',
    processingEyebrow: '処理中',
    processingTitle: 'メニューを解析しています',
    processingDesc: '料理名の認識、翻訳、為替計算を進めています',
    imageMissing: '画像を取得できませんでした。もう一度お試しください。',
    fallbackError: 'バックエンド解析に失敗したため、デモメニューを表示しています: ',
    parseError: 'サーバーから返されたデータ形式が正しくありません',
    uploadError: '画像のアップロードに失敗しました',
    identifyMenu: 'メニュー解析',
    exchangeRate: '為替',
    retry: '再解析',
    currencySettings: '通貨設定',
    currencySettingsHint: 'メニュー通貨と換算通貨をまとめて設定',
    sourceCurrency: 'メニュー通貨',
    targetCurrency: '換算通貨',
    swapCurrencies: '通貨を入れ替え',
    applyCurrencySettings: '設定を反映',
    search: '検索',
    collapseSearch: '検索を閉じる',
    searchPlaceholder: '料理名、原文、カテゴリを検索',
    clear: 'クリア',
    backendHint: 'バックエンド情報',
    emptyItems: '一致する料理がありません',
    dishCountSuffix: '品',
    total: '合計',
    generateReceipt: '注文票を作成',
    cartSummary: 'カート詳細',
    cartSummaryHint: '選択した割引、セット、追加項目ごとに集計',
    copyOrder: '注文をコピー',
    copied: 'コピーしました',
    orderText: '注文内容',
    promotionSingle: '単品',
    promotionTiered: '価格帯',
    promotionBundle: 'セット',
    promotionFallback: '原文ルール',
    selectOption: '内容を選ぶ',
    addAnother: 'もう1つ追加',
    confirmSelection: 'カートに追加',
    cancel: 'キャンセル',
    bundleIncludes: 'セット内容',
    addOnRule: '追加オプション',
    bonusRule: '付属内容',
    promotionSource: '割引説明',
    globalAddOnRule: '共通追加ルール',
    pendingRuleConfirmation: 'ルール確認待ち',
    selectedTier: '選択した価格帯',
    selectedAddOns: '選択した追加',
    finalAmount: '小計',
    unitPrice: '単価',
    priceFrom: 'から',
    itemsUnit: '点',
    itemSingular: '点',
    itemPlural: '点'
  },
  ko: {
    appTitle: 'AI 메뉴',
    menuTitle: '메뉴',
    receiptTitle: '주문표',
    takePhoto: '사진으로 인식',
    importAlbum: '앨범에서 가져오기',
    notice: '안내',
    processingEyebrow: '처리 중',
    processingTitle: '메뉴를 분석하고 있어요',
    processingDesc: '메뉴명 인식, 번역, 환율 계산을 진행 중입니다',
    imageMissing: '이미지를 가져오지 못했습니다. 다시 시도해 주세요.',
    fallbackError: '백엔드 해석에 실패해 데모 메뉴를 불러왔습니다: ',
    parseError: '서버가 올바르지 않은 형식의 데이터를 반환했습니다',
    uploadError: '이미지 업로드에 실패했습니다',
    identifyMenu: '메뉴 인식',
    exchangeRate: '환율',
    retry: '다시 인식',
    currencySettings: '통화 설정',
    currencySettingsHint: '메뉴 통화와 환산 통화를 함께 설정',
    sourceCurrency: '메뉴 통화',
    targetCurrency: '환산 통화',
    swapCurrencies: '통화 바꾸기',
    applyCurrencySettings: '설정 적용',
    search: '검색',
    collapseSearch: '검색 닫기',
    searchPlaceholder: '메뉴명, 원문, 카테고리 검색',
    clear: '지우기',
    backendHint: '백엔드 안내',
    emptyItems: '일치하는 메뉴가 없습니다',
    dishCountSuffix: '개 메뉴',
    total: '합계',
    generateReceipt: '주문표 만들기',
    cartSummary: '장바구니 상세',
    cartSummaryHint: '선택한 할인 단계, 세트, 추가 항목 기준으로 표시',
    copyOrder: '주문 복사',
    copied: '복사되었습니다',
    orderText: '주문 내용',
    promotionSingle: '단품',
    promotionTiered: '할인 단계',
    promotionBundle: '세트',
    promotionFallback: '원문 규칙',
    selectOption: '옵션 선택',
    addAnother: '하나 더 선택',
    confirmSelection: '장바구니 담기',
    cancel: '취소',
    bundleIncludes: '세트 구성',
    addOnRule: '추가 구매',
    bonusRule: '증정',
    promotionSource: '프로모션 설명',
    globalAddOnRule: '공통 추가 규칙',
    pendingRuleConfirmation: '규칙 확인 필요',
    selectedTier: '선택한 단계',
    selectedAddOns: '선택한 추가',
    finalAmount: '소계',
    unitPrice: '단가',
    priceFrom: '부터',
    itemsUnit: '개',
    itemSingular: '개',
    itemPlural: '개'
  },
  en: {
    appTitle: 'AI Menu',
    menuTitle: 'Menu',
    receiptTitle: 'Order Slip',
    takePhoto: 'Scan From Camera',
    importAlbum: 'Import From Album',
    notice: 'Notice',
    processingEyebrow: 'Processing',
    processingTitle: 'Parsing Menu',
    processingDesc: 'Recognizing dishes, translating names, and calculating exchange rates',
    imageMissing: 'No image was captured. Please try again.',
    fallbackError: 'Backend parsing failed, demo menu loaded: ',
    parseError: 'The server returned data in an invalid format',
    uploadError: 'Image upload failed',
    identifyMenu: 'Recognized Menu',
    exchangeRate: 'Rate',
    retry: 'Scan Again',
    currencySettings: 'Currency Settings',
    currencySettingsHint: 'Set the menu currency and target currency together',
    sourceCurrency: 'Menu Currency',
    targetCurrency: 'Convert To',
    swapCurrencies: 'Swap Currencies',
    applyCurrencySettings: 'Apply Settings',
    search: 'Search',
    collapseSearch: 'Hide Search',
    searchPlaceholder: 'Search dish, original text, or category',
    clear: 'Clear',
    backendHint: 'Backend Notice',
    emptyItems: 'No matching dishes found',
    dishCountSuffix: 'dishes',
    total: 'Total',
    generateReceipt: 'Create Slip',
    cartSummary: 'Cart Summary',
    cartSummaryHint: 'Grouped by selected tier, combo, and add-ons',
    copyOrder: 'Copy Order',
    copied: 'Copied',
    orderText: 'Order Details',
    promotionSingle: 'Single',
    promotionTiered: 'Tiered Deal',
    promotionBundle: 'Combo',
    promotionFallback: 'Raw Rule',
    selectOption: 'Choose Options',
    addAnother: 'Add Another',
    confirmSelection: 'Add To Cart',
    cancel: 'Cancel',
    bundleIncludes: 'Includes',
    addOnRule: 'Add-on Rule',
    bonusRule: 'Bonus',
    promotionSource: 'Promotion',
    globalAddOnRule: 'Global Add-ons',
    pendingRuleConfirmation: 'Rule Needs Confirmation',
    selectedTier: 'Selected Tier',
    selectedAddOns: 'Selected Add-ons',
    finalAmount: 'Subtotal',
    unitPrice: 'Unit Price',
    priceFrom: 'From',
    itemsUnit: 'items',
    itemSingular: 'item',
    itemPlural: 'items'
  }
};

const RECEIPT_SOURCE_COPY = {
  'zh-CN': {
    title: '我想点...',
    thanks: '非常感谢！'
  },
  'zh-TW': {
    title: '我想點...',
    thanks: '非常感謝！'
  },
  ja: {
    title: 'これをお願いします',
    thanks: 'ありがとうございます！'
  },
  ko: {
    title: '이걸로 주세요',
    thanks: '감사합니다!'
  },
  en: {
    title: 'I would like to order...',
    thanks: 'Thank you very much!'
  }
};

function normalizeAppLanguage(tag) {
  const normalized = normalizeLanguageTag(tag);
  if (!normalized) return 'zh-CN';
  if (normalized.startsWith('zh-TW') || normalized.startsWith('zh-HK')) return 'zh-TW';
  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('en')) return 'en';
  return 'en';
}

function inferSourceLanguage(items = []) {
  const sourceText = (items || [])
    .map((item) => item.originalName || '')
    .join(' ');

  if (/[ぁ-ゟ゠-ヿ]/.test(sourceText)) return 'ja';
  if (/[가-힣]/.test(sourceText)) return 'ko';
  if (/[A-Za-z]/.test(sourceText) && !/[\u4e00-\u9fff]/.test(sourceText)) return 'en';
  if (/[臺灣歡謝點請這裡個們後餐飲麵飯餃]/.test(sourceText)) return 'zh-TW';
  if (/[\u4e00-\u9fff]/.test(sourceText)) return 'zh-CN';
  return 'en';
}

function getSystemCopy(language) {
  return SYSTEM_COPY[normalizeAppLanguage(language)] || SYSTEM_COPY.en;
}

function getReceiptSourceCopy(language) {
  return RECEIPT_SOURCE_COPY[normalizeAppLanguage(language)] || RECEIPT_SOURCE_COPY.en;
}

function getCurrencyDisplayName(language, currencyCode) {
  const normalizedLanguage = normalizeAppLanguage(language);
  const normalizedCode = String(currencyCode || '').toUpperCase();
  const table = CURRENCY_NAMES[normalizedLanguage] || CURRENCY_NAMES.en;
  return table[normalizedCode] || normalizedCode;
}

function getCurrencyOptionList(language, currencyCodes = []) {
  return (currencyCodes || []).map((code) => ({
    code,
    name: getCurrencyDisplayName(language, code)
  }));
}

module.exports = {
  SUPPORTED_LANGUAGES,
  normalizeAppLanguage,
  inferSourceLanguage,
  getSystemCopy,
  getReceiptSourceCopy,
  getCurrencyDisplayName,
  getCurrencyOptionList
};
