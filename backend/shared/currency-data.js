const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "KRW",
  "AUD",
  "CAD",
  "HKD",
  "SGD",
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BZD",
  "CDF",
  "CHF",
  "CLP",
  "COP",
  "CRC",
  "CUC",
  "CUP",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ERN",
  "ETB",
  "FJD",
  "FKP",
  "GEL",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HNL",
  "HRK",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  "JMD",
  "JOD",
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KPW",
  "KWD",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "LYD",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SHP",
  "SLE",
  "SLL",
  "SOS",
  "SRD",
  "SSP",
  "STN",
  "SVC",
  "SYP",
  "SZL",
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "UYU",
  "UZS",
  "VES",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XCD",
  "XCG",
  "XDR",
  "XOF",
  "XPF",
  "XSU",
  "YER",
  "ZAR",
  "ZMW",
  "ZWG",
  "ZWL"
];

const CURRENCY_METADATA = {
  "USD": {
    "fractionDigits": 2
  },
  "EUR": {
    "fractionDigits": 2
  },
  "GBP": {
    "fractionDigits": 2
  },
  "JPY": {
    "fractionDigits": 0
  },
  "CNY": {
    "fractionDigits": 2
  },
  "KRW": {
    "fractionDigits": 0
  },
  "AUD": {
    "fractionDigits": 2
  },
  "CAD": {
    "fractionDigits": 2
  },
  "HKD": {
    "fractionDigits": 2
  },
  "SGD": {
    "fractionDigits": 2
  },
  "AED": {
    "fractionDigits": 2
  },
  "AFN": {
    "fractionDigits": 0
  },
  "ALL": {
    "fractionDigits": 0
  },
  "AMD": {
    "fractionDigits": 2
  },
  "ANG": {
    "fractionDigits": 2
  },
  "AOA": {
    "fractionDigits": 2
  },
  "ARS": {
    "fractionDigits": 2
  },
  "AWG": {
    "fractionDigits": 2
  },
  "AZN": {
    "fractionDigits": 2
  },
  "BAM": {
    "fractionDigits": 2
  },
  "BBD": {
    "fractionDigits": 2
  },
  "BDT": {
    "fractionDigits": 2
  },
  "BGN": {
    "fractionDigits": 2
  },
  "BHD": {
    "fractionDigits": 3
  },
  "BIF": {
    "fractionDigits": 0
  },
  "BMD": {
    "fractionDigits": 2
  },
  "BND": {
    "fractionDigits": 2
  },
  "BOB": {
    "fractionDigits": 2
  },
  "BRL": {
    "fractionDigits": 2
  },
  "BSD": {
    "fractionDigits": 2
  },
  "BTN": {
    "fractionDigits": 2
  },
  "BWP": {
    "fractionDigits": 2
  },
  "BYN": {
    "fractionDigits": 2
  },
  "BZD": {
    "fractionDigits": 2
  },
  "CDF": {
    "fractionDigits": 2
  },
  "CHF": {
    "fractionDigits": 2
  },
  "CLP": {
    "fractionDigits": 0
  },
  "COP": {
    "fractionDigits": 2
  },
  "CRC": {
    "fractionDigits": 2
  },
  "CUC": {
    "fractionDigits": 2
  },
  "CUP": {
    "fractionDigits": 2
  },
  "CVE": {
    "fractionDigits": 2
  },
  "CZK": {
    "fractionDigits": 2
  },
  "DJF": {
    "fractionDigits": 0
  },
  "DKK": {
    "fractionDigits": 2
  },
  "DOP": {
    "fractionDigits": 2
  },
  "DZD": {
    "fractionDigits": 2
  },
  "EGP": {
    "fractionDigits": 2
  },
  "ERN": {
    "fractionDigits": 2
  },
  "ETB": {
    "fractionDigits": 2
  },
  "FJD": {
    "fractionDigits": 2
  },
  "FKP": {
    "fractionDigits": 2
  },
  "GEL": {
    "fractionDigits": 2
  },
  "GHS": {
    "fractionDigits": 2
  },
  "GIP": {
    "fractionDigits": 2
  },
  "GMD": {
    "fractionDigits": 2
  },
  "GNF": {
    "fractionDigits": 0
  },
  "GTQ": {
    "fractionDigits": 2
  },
  "GYD": {
    "fractionDigits": 2
  },
  "HNL": {
    "fractionDigits": 2
  },
  "HRK": {
    "fractionDigits": 2
  },
  "HTG": {
    "fractionDigits": 2
  },
  "HUF": {
    "fractionDigits": 2
  },
  "IDR": {
    "fractionDigits": 2
  },
  "ILS": {
    "fractionDigits": 2
  },
  "INR": {
    "fractionDigits": 2
  },
  "IQD": {
    "fractionDigits": 0
  },
  "IRR": {
    "fractionDigits": 0
  },
  "ISK": {
    "fractionDigits": 0
  },
  "JMD": {
    "fractionDigits": 2
  },
  "JOD": {
    "fractionDigits": 3
  },
  "KES": {
    "fractionDigits": 2
  },
  "KGS": {
    "fractionDigits": 2
  },
  "KHR": {
    "fractionDigits": 2
  },
  "KMF": {
    "fractionDigits": 0
  },
  "KPW": {
    "fractionDigits": 0
  },
  "KWD": {
    "fractionDigits": 3
  },
  "KYD": {
    "fractionDigits": 2
  },
  "KZT": {
    "fractionDigits": 2
  },
  "LAK": {
    "fractionDigits": 0
  },
  "LBP": {
    "fractionDigits": 0
  },
  "LKR": {
    "fractionDigits": 2
  },
  "LRD": {
    "fractionDigits": 2
  },
  "LSL": {
    "fractionDigits": 2
  },
  "LYD": {
    "fractionDigits": 3
  },
  "MAD": {
    "fractionDigits": 2
  },
  "MDL": {
    "fractionDigits": 2
  },
  "MGA": {
    "fractionDigits": 0
  },
  "MKD": {
    "fractionDigits": 2
  },
  "MMK": {
    "fractionDigits": 0
  },
  "MNT": {
    "fractionDigits": 2
  },
  "MOP": {
    "fractionDigits": 2
  },
  "MRU": {
    "fractionDigits": 2
  },
  "MUR": {
    "fractionDigits": 2
  },
  "MVR": {
    "fractionDigits": 2
  },
  "MWK": {
    "fractionDigits": 2
  },
  "MXN": {
    "fractionDigits": 2
  },
  "MYR": {
    "fractionDigits": 2
  },
  "MZN": {
    "fractionDigits": 2
  },
  "NAD": {
    "fractionDigits": 2
  },
  "NGN": {
    "fractionDigits": 2
  },
  "NIO": {
    "fractionDigits": 2
  },
  "NOK": {
    "fractionDigits": 2
  },
  "NPR": {
    "fractionDigits": 2
  },
  "NZD": {
    "fractionDigits": 2
  },
  "OMR": {
    "fractionDigits": 3
  },
  "PAB": {
    "fractionDigits": 2
  },
  "PEN": {
    "fractionDigits": 2
  },
  "PGK": {
    "fractionDigits": 2
  },
  "PHP": {
    "fractionDigits": 2
  },
  "PKR": {
    "fractionDigits": 2
  },
  "PLN": {
    "fractionDigits": 2
  },
  "PYG": {
    "fractionDigits": 0
  },
  "QAR": {
    "fractionDigits": 2
  },
  "RON": {
    "fractionDigits": 2
  },
  "RSD": {
    "fractionDigits": 0
  },
  "RUB": {
    "fractionDigits": 2
  },
  "RWF": {
    "fractionDigits": 0
  },
  "SAR": {
    "fractionDigits": 2
  },
  "SBD": {
    "fractionDigits": 2
  },
  "SCR": {
    "fractionDigits": 2
  },
  "SDG": {
    "fractionDigits": 2
  },
  "SEK": {
    "fractionDigits": 2
  },
  "SHP": {
    "fractionDigits": 2
  },
  "SLE": {
    "fractionDigits": 2
  },
  "SLL": {
    "fractionDigits": 0
  },
  "SOS": {
    "fractionDigits": 0
  },
  "SRD": {
    "fractionDigits": 2
  },
  "SSP": {
    "fractionDigits": 2
  },
  "STN": {
    "fractionDigits": 2
  },
  "SVC": {
    "fractionDigits": 2
  },
  "SYP": {
    "fractionDigits": 0
  },
  "SZL": {
    "fractionDigits": 2
  },
  "THB": {
    "fractionDigits": 2
  },
  "TJS": {
    "fractionDigits": 2
  },
  "TMT": {
    "fractionDigits": 2
  },
  "TND": {
    "fractionDigits": 3
  },
  "TOP": {
    "fractionDigits": 2
  },
  "TRY": {
    "fractionDigits": 2
  },
  "TTD": {
    "fractionDigits": 2
  },
  "TWD": {
    "fractionDigits": 2
  },
  "TZS": {
    "fractionDigits": 2
  },
  "UAH": {
    "fractionDigits": 2
  },
  "UGX": {
    "fractionDigits": 0
  },
  "UYU": {
    "fractionDigits": 2
  },
  "UZS": {
    "fractionDigits": 2
  },
  "VES": {
    "fractionDigits": 2
  },
  "VND": {
    "fractionDigits": 0
  },
  "VUV": {
    "fractionDigits": 0
  },
  "WST": {
    "fractionDigits": 2
  },
  "XAF": {
    "fractionDigits": 0
  },
  "XCD": {
    "fractionDigits": 2
  },
  "XCG": {
    "fractionDigits": 2
  },
  "XDR": {
    "fractionDigits": 2
  },
  "XOF": {
    "fractionDigits": 0
  },
  "XPF": {
    "fractionDigits": 0
  },
  "XSU": {
    "fractionDigits": 2
  },
  "YER": {
    "fractionDigits": 0
  },
  "ZAR": {
    "fractionDigits": 2
  },
  "ZMW": {
    "fractionDigits": 2
  },
  "ZWG": {
    "fractionDigits": 2
  },
  "ZWL": {
    "fractionDigits": 2
  }
};

const CURRENCY_NAMES = {
  "zh-CN": {
    "USD": "美元",
    "EUR": "欧元",
    "GBP": "英镑",
    "JPY": "日元",
    "CNY": "人民币",
    "KRW": "韩元",
    "AUD": "澳大利亚元",
    "CAD": "加拿大元",
    "HKD": "港元",
    "SGD": "新加坡元",
    "AED": "阿联酋迪拉姆",
    "AFN": "阿富汗尼",
    "ALL": "阿尔巴尼亚列克",
    "AMD": "亚美尼亚德拉姆",
    "ANG": "荷属安的列斯盾",
    "AOA": "安哥拉宽扎",
    "ARS": "阿根廷比索",
    "AWG": "阿鲁巴弗罗林",
    "AZN": "阿塞拜疆马纳特",
    "BAM": "波斯尼亚-黑塞哥维那可兑换马克",
    "BBD": "巴巴多斯元",
    "BDT": "孟加拉塔卡",
    "BGN": "保加利亚列弗",
    "BHD": "巴林第纳尔",
    "BIF": "布隆迪法郎",
    "BMD": "百慕大元",
    "BND": "文莱元",
    "BOB": "玻利维亚诺",
    "BRL": "巴西雷亚尔",
    "BSD": "巴哈马元",
    "BTN": "不丹努尔特鲁姆",
    "BWP": "博茨瓦纳普拉",
    "BYN": "白俄罗斯卢布",
    "BZD": "伯利兹元",
    "CDF": "刚果法郎",
    "CHF": "瑞士法郎",
    "CLP": "智利比索",
    "COP": "哥伦比亚比索",
    "CRC": "哥斯达黎加科朗",
    "CUC": "古巴可兑换比索",
    "CUP": "古巴比索",
    "CVE": "佛得角埃斯库多",
    "CZK": "捷克克朗",
    "DJF": "吉布提法郎",
    "DKK": "丹麦克朗",
    "DOP": "多米尼加比索",
    "DZD": "阿尔及利亚第纳尔",
    "EGP": "埃及镑",
    "ERN": "厄立特里亚纳克法",
    "ETB": "埃塞俄比亚比尔",
    "FJD": "斐济元",
    "FKP": "福克兰群岛镑",
    "GEL": "格鲁吉亚拉里",
    "GHS": "加纳塞地",
    "GIP": "直布罗陀镑",
    "GMD": "冈比亚达拉西",
    "GNF": "几内亚法郎",
    "GTQ": "危地马拉格查尔",
    "GYD": "圭亚那元",
    "HNL": "洪都拉斯伦皮拉",
    "HRK": "克罗地亚库纳",
    "HTG": "海地古德",
    "HUF": "匈牙利福林",
    "IDR": "印度尼西亚卢比",
    "ILS": "以色列新谢克尔",
    "INR": "印度卢比",
    "IQD": "伊拉克第纳尔",
    "IRR": "伊朗里亚尔",
    "ISK": "冰岛克朗",
    "JMD": "牙买加元",
    "JOD": "约旦第纳尔",
    "KES": "肯尼亚先令",
    "KGS": "吉尔吉斯斯坦索姆",
    "KHR": "柬埔寨瑞尔",
    "KMF": "科摩罗法郎",
    "KPW": "朝鲜元",
    "KWD": "科威特第纳尔",
    "KYD": "开曼元",
    "KZT": "哈萨克斯坦坚戈",
    "LAK": "老挝基普",
    "LBP": "黎巴嫩镑",
    "LKR": "斯里兰卡卢比",
    "LRD": "利比里亚元",
    "LSL": "莱索托洛蒂",
    "LYD": "利比亚第纳尔",
    "MAD": "摩洛哥迪拉姆",
    "MDL": "摩尔多瓦列伊",
    "MGA": "马达加斯加阿里亚里",
    "MKD": "马其顿第纳尔",
    "MMK": "缅甸元",
    "MNT": "蒙古图格里克",
    "MOP": "澳门币",
    "MRU": "毛里塔尼亚乌吉亚",
    "MUR": "毛里求斯卢比",
    "MVR": "马尔代夫卢菲亚",
    "MWK": "马拉维克瓦查",
    "MXN": "墨西哥比索",
    "MYR": "马来西亚林吉特",
    "MZN": "莫桑比克美提卡",
    "NAD": "纳米比亚元",
    "NGN": "尼日利亚奈拉",
    "NIO": "尼加拉瓜科多巴",
    "NOK": "挪威克朗",
    "NPR": "尼泊尔卢比",
    "NZD": "新西兰元",
    "OMR": "阿曼里亚尔",
    "PAB": "巴拿马巴波亚",
    "PEN": "秘鲁索尔",
    "PGK": "巴布亚新几内亚基那",
    "PHP": "菲律宾比索",
    "PKR": "巴基斯坦卢比",
    "PLN": "波兰兹罗提",
    "PYG": "巴拉圭瓜拉尼",
    "QAR": "卡塔尔里亚尔",
    "RON": "罗马尼亚列伊",
    "RSD": "塞尔维亚第纳尔",
    "RUB": "俄罗斯卢布",
    "RWF": "卢旺达法郎",
    "SAR": "沙特里亚尔",
    "SBD": "所罗门群岛元",
    "SCR": "塞舌尔卢比",
    "SDG": "苏丹镑",
    "SEK": "瑞典克朗",
    "SHP": "圣赫勒拿群岛磅",
    "SLE": "塞拉利昂新利昂",
    "SLL": "塞拉利昂利昂",
    "SOS": "索马里先令",
    "SRD": "苏里南元",
    "SSP": "南苏丹镑",
    "STN": "圣多美和普林西比多布拉",
    "SVC": "萨尔瓦多科朗",
    "SYP": "叙利亚镑",
    "SZL": "斯威士兰里兰吉尼",
    "THB": "泰铢",
    "TJS": "塔吉克斯坦索莫尼",
    "TMT": "土库曼斯坦马纳特",
    "TND": "突尼斯第纳尔",
    "TOP": "汤加潘加",
    "TRY": "土耳其里拉",
    "TTD": "特立尼达和多巴哥元",
    "TWD": "新台币",
    "TZS": "坦桑尼亚先令",
    "UAH": "乌克兰格里夫纳",
    "UGX": "乌干达先令",
    "UYU": "乌拉圭比索",
    "UZS": "乌兹别克斯坦苏姆",
    "VES": "委内瑞拉玻利瓦尔",
    "VND": "越南盾",
    "VUV": "瓦努阿图瓦图",
    "WST": "萨摩亚塔拉",
    "XAF": "中非法郎",
    "XCD": "东加勒比元",
    "XCG": "XCG",
    "XDR": "特别提款权",
    "XOF": "西非法郎",
    "XPF": "太平洋法郎",
    "XSU": "苏克雷",
    "YER": "也门里亚尔",
    "ZAR": "南非兰特",
    "ZMW": "赞比亚克瓦查",
    "ZWG": "ZWG",
    "ZWL": "津巴布韦元 (2009)"
  },
  "zh-TW": {
    "USD": "美元",
    "EUR": "歐元",
    "GBP": "英鎊",
    "JPY": "日圓",
    "CNY": "人民幣",
    "KRW": "韓元",
    "AUD": "澳幣",
    "CAD": "加幣",
    "HKD": "港幣",
    "SGD": "新加坡幣",
    "AED": "阿拉伯聯合大公國迪爾汗",
    "AFN": "阿富汗尼",
    "ALL": "阿爾巴尼亞列克",
    "AMD": "亞美尼亞德拉姆",
    "ANG": "荷屬安地列斯盾",
    "AOA": "安哥拉寬扎",
    "ARS": "阿根廷披索",
    "AWG": "阿路巴盾",
    "AZN": "亞塞拜然馬納特",
    "BAM": "波士尼亞-赫塞哥維納可轉換馬克",
    "BBD": "巴貝多元",
    "BDT": "孟加拉塔卡",
    "BGN": "保加利亞新列弗",
    "BHD": "巴林第納爾",
    "BIF": "蒲隆地法郎",
    "BMD": "百慕達幣",
    "BND": "汶萊元",
    "BOB": "玻利維亞諾",
    "BRL": "巴西雷亞爾",
    "BSD": "巴哈馬元",
    "BTN": "不丹那特倫",
    "BWP": "波札那普拉",
    "BYN": "白俄羅斯盧布",
    "BZD": "貝里斯元",
    "CDF": "剛果法郎",
    "CHF": "瑞士法郎",
    "CLP": "智利披索",
    "COP": "哥倫比亞披索",
    "CRC": "哥斯大黎加科朗",
    "CUC": "古巴可轉換披索",
    "CUP": "古巴披索",
    "CVE": "維德角埃斯庫多",
    "CZK": "捷克克朗",
    "DJF": "吉布地法郎",
    "DKK": "丹麥克朗",
    "DOP": "多明尼加披索",
    "DZD": "阿爾及利亞第納爾",
    "EGP": "埃及鎊",
    "ERN": "厄立特里亞納克法",
    "ETB": "衣索比亞比爾",
    "FJD": "斐濟元",
    "FKP": "福克蘭群島鎊",
    "GEL": "喬治亞拉里",
    "GHS": "迦納塞地",
    "GIP": "直布羅陀鎊",
    "GMD": "甘比亞達拉西",
    "GNF": "幾內亞法郎",
    "GTQ": "瓜地馬拉格查爾",
    "GYD": "圭亞那元",
    "HNL": "洪都拉斯倫皮拉",
    "HRK": "克羅埃西亞庫納",
    "HTG": "海地古德",
    "HUF": "匈牙利福林",
    "IDR": "印尼盾",
    "ILS": "以色列新謝克爾",
    "INR": "印度盧比",
    "IQD": "伊拉克第納爾",
    "IRR": "伊朗里亞爾",
    "ISK": "冰島克朗",
    "JMD": "牙買加元",
    "JOD": "約旦第納爾",
    "KES": "肯尼亞先令",
    "KGS": "吉爾吉斯索姆",
    "KHR": "柬埔寨瑞爾",
    "KMF": "科摩羅法郎",
    "KPW": "北韓元",
    "KWD": "科威特第納爾",
    "KYD": "開曼群島元",
    "KZT": "哈薩克堅戈",
    "LAK": "寮國基普",
    "LBP": "黎巴嫩鎊",
    "LKR": "斯里蘭卡盧比",
    "LRD": "賴比瑞亞元",
    "LSL": "賴索托洛蒂",
    "LYD": "利比亞第納爾",
    "MAD": "摩洛哥迪拉姆",
    "MDL": "摩杜雲列伊",
    "MGA": "馬達加斯加阿里亞里",
    "MKD": "馬其頓第納爾",
    "MMK": "緬甸元",
    "MNT": "蒙古圖格里克",
    "MOP": "澳門元",
    "MRU": "茅利塔尼亞烏吉亞",
    "MUR": "模里西斯盧比",
    "MVR": "馬爾地夫盧非亞",
    "MWK": "馬拉維克瓦查",
    "MXN": "墨西哥披索",
    "MYR": "馬來西亞令吉",
    "MZN": "莫三比克梅蒂卡爾",
    "NAD": "納米比亞元",
    "NGN": "奈及利亞奈拉",
    "NIO": "尼加拉瓜金科多巴",
    "NOK": "挪威克朗",
    "NPR": "尼泊爾盧比",
    "NZD": "紐西蘭幣",
    "OMR": "阿曼里亞爾",
    "PAB": "巴拿馬巴波亞",
    "PEN": "秘魯太陽幣",
    "PGK": "巴布亞紐幾內亞基那",
    "PHP": "菲律賓披索",
    "PKR": "巴基斯坦盧比",
    "PLN": "波蘭茲羅提",
    "PYG": "巴拉圭瓜拉尼",
    "QAR": "卡達里亞爾",
    "RON": "羅馬尼亞列伊",
    "RSD": "塞爾維亞戴納",
    "RUB": "俄羅斯盧布",
    "RWF": "盧安達法郎",
    "SAR": "沙烏地里亞爾",
    "SBD": "索羅門群島元",
    "SCR": "塞席爾盧比",
    "SDG": "蘇丹鎊",
    "SEK": "瑞典克朗",
    "SHP": "聖赫勒拿鎊",
    "SLE": "獅子山利昂",
    "SLL": "獅子山利昂 (1964—2022)",
    "SOS": "索馬利亞先令",
    "SRD": "蘇利南元",
    "SSP": "南蘇丹鎊",
    "STN": "聖多美島和普林西比島多布拉",
    "SVC": "薩爾瓦多科郎",
    "SYP": "敘利亞鎊",
    "SZL": "史瓦帝尼朗吉尼",
    "THB": "泰銖",
    "TJS": "塔吉克索莫尼",
    "TMT": "土庫曼馬納特",
    "TND": "突尼西亞第納爾",
    "TOP": "東加潘加",
    "TRY": "土耳其里拉",
    "TTD": "千里達及托巴哥元",
    "TWD": "新台幣",
    "TZS": "坦尚尼亞先令",
    "UAH": "烏克蘭格里夫納",
    "UGX": "烏干達先令",
    "UYU": "烏拉圭披索",
    "UZS": "烏茲別克索姆",
    "VES": "委內瑞拉玻利瓦",
    "VND": "越南盾",
    "VUV": "萬那杜瓦圖",
    "WST": "西薩摩亞塔拉",
    "XAF": "法郎 (CFA–BEAC)",
    "XCD": "格瑞那達元",
    "XCG": "XCG",
    "XDR": "特殊提款權",
    "XOF": "法郎 (CFA–BCEAO)",
    "XPF": "法郎 (CFP)",
    "XSU": "蘇克雷貨幣",
    "YER": "葉門里亞爾",
    "ZAR": "南非蘭特",
    "ZMW": "尚比亞克瓦查",
    "ZWG": "ZWG",
    "ZWL": "辛巴威元 (2009)"
  },
  "ja": {
    "USD": "米ドル",
    "EUR": "ユーロ",
    "GBP": "英国ポンド",
    "JPY": "日本円",
    "CNY": "中国人民元",
    "KRW": "韓国ウォン",
    "AUD": "オーストラリア ドル",
    "CAD": "カナダ ドル",
    "HKD": "香港ドル",
    "SGD": "シンガポール ドル",
    "AED": "アラブ首長国連邦ディルハム",
    "AFN": "アフガニスタン アフガニー",
    "ALL": "アルバニア レク",
    "AMD": "アルメニア ドラム",
    "ANG": "オランダ領アンティル ギルダー",
    "AOA": "アンゴラ クワンザ",
    "ARS": "アルゼンチン ペソ",
    "AWG": "アルバ フロリン",
    "AZN": "アゼルバイジャン マナト",
    "BAM": "ボスニア・ヘルツェゴビナ 兌換マルク (BAM)",
    "BBD": "バルバドス ドル",
    "BDT": "バングラデシュ タカ",
    "BGN": "ブルガリア 新レフ",
    "BHD": "バーレーン ディナール",
    "BIF": "ブルンジ フラン",
    "BMD": "バミューダ ドル",
    "BND": "ブルネイ ドル",
    "BOB": "ボリビア ボリビアーノ",
    "BRL": "ブラジル レアル",
    "BSD": "バハマ ドル",
    "BTN": "ブータン ニュルタム",
    "BWP": "ボツワナ プラ",
    "BYN": "ベラルーシ ルーブル",
    "BZD": "ベリーズ ドル",
    "CDF": "コンゴ フラン",
    "CHF": "スイス フラン",
    "CLP": "チリ ペソ",
    "COP": "コロンビア ペソ",
    "CRC": "コスタリカ コロン",
    "CUC": "キューバ 兌換ペソ",
    "CUP": "キューバ ペソ",
    "CVE": "カーボベルデ エスクード",
    "CZK": "チェコ コルナ",
    "DJF": "ジブチ フラン",
    "DKK": "デンマーク クローネ",
    "DOP": "ドミニカ ペソ",
    "DZD": "アルジェリア ディナール",
    "EGP": "エジプト ポンド",
    "ERN": "エリトリア ナクファ",
    "ETB": "エチオピア ブル",
    "FJD": "フィジー ドル",
    "FKP": "フォークランド（マルビナス）諸島 ポンド",
    "GEL": "ジョージア ラリ",
    "GHS": "ガーナ セディ",
    "GIP": "ジブラルタル ポンド",
    "GMD": "ガンビア ダラシ",
    "GNF": "ギニア フラン",
    "GTQ": "グアテマラ ケツァル",
    "GYD": "ガイアナ ドル",
    "HNL": "ホンジュラス レンピラ",
    "HRK": "クロアチア クーナ",
    "HTG": "ハイチ グールド",
    "HUF": "ハンガリー フォリント",
    "IDR": "インドネシア ルピア",
    "ILS": "イスラエル新シェケル",
    "INR": "インド ルピー",
    "IQD": "イラク ディナール",
    "IRR": "イラン リアル",
    "ISK": "アイスランド クローナ",
    "JMD": "ジャマイカ ドル",
    "JOD": "ヨルダン ディナール",
    "KES": "ケニア シリング",
    "KGS": "キルギス ソム",
    "KHR": "カンボジア リエル",
    "KMF": "コモロ フラン",
    "KPW": "北朝鮮ウォン",
    "KWD": "クウェート ディナール",
    "KYD": "ケイマン諸島 ドル",
    "KZT": "カザフスタン テンゲ",
    "LAK": "ラオス キープ",
    "LBP": "レバノン ポンド",
    "LKR": "スリランカ ルピー",
    "LRD": "リベリア ドル",
    "LSL": "レソト ロティ",
    "LYD": "リビア ディナール",
    "MAD": "モロッコ ディルハム",
    "MDL": "モルドバ レイ",
    "MGA": "マダガスカル アリアリ",
    "MKD": "マケドニア デナル",
    "MMK": "ミャンマー チャット",
    "MNT": "モンゴル トグログ",
    "MOP": "マカオ パタカ",
    "MRU": "モーリタニア ウギア",
    "MUR": "モーリシャス ルピー",
    "MVR": "モルディブ ルフィア",
    "MWK": "マラウィ クワチャ",
    "MXN": "メキシコ ペソ",
    "MYR": "マレーシア リンギット",
    "MZN": "モザンビーク メティカル",
    "NAD": "ナミビア ドル",
    "NGN": "ナイジェリア ナイラ",
    "NIO": "ニカラグア コルドバ オロ",
    "NOK": "ノルウェー クローネ",
    "NPR": "ネパール ルピー",
    "NZD": "ニュージーランド ドル",
    "OMR": "オマーン リアル",
    "PAB": "パナマ バルボア",
    "PEN": "ペルー ソル",
    "PGK": "パプアニューギニア キナ",
    "PHP": "フィリピン ペソ",
    "PKR": "パキスタン ルピー",
    "PLN": "ポーランド ズウォティ",
    "PYG": "パラグアイ グアラニ",
    "QAR": "カタール リアル",
    "RON": "ルーマニア レイ",
    "RSD": "セルビア ディナール",
    "RUB": "ロシア ルーブル",
    "RWF": "ルワンダ フラン",
    "SAR": "サウジ リヤル",
    "SBD": "ソロモン諸島 ドル",
    "SCR": "セーシェル ルピー",
    "SDG": "スーダン ポンド",
    "SEK": "スウェーデン クローナ",
    "SHP": "セントヘレナ ポンド",
    "SLE": "シエラレオネ レオン",
    "SLL": "シエラレオネ レオン (1964—2022)",
    "SOS": "ソマリア シリング",
    "SRD": "スリナム ドル",
    "SSP": "南スーダン ポンド",
    "STN": "サントメ・プリンシペ ドブラ",
    "SVC": "エルサルバドル コロン",
    "SYP": "シリア ポンド",
    "SZL": "スワジランド リランゲニ",
    "THB": "タイ バーツ",
    "TJS": "タジキスタン ソモニ",
    "TMT": "トルクメニスタン マナト",
    "TND": "チュニジア ディナール",
    "TOP": "トンガ パ・アンガ",
    "TRY": "トルコ リラ",
    "TTD": "トリニダード・トバゴ ドル",
    "TWD": "新台湾ドル",
    "TZS": "タンザニア シリング",
    "UAH": "ウクライナ フリヴニャ",
    "UGX": "ウガンダ シリング",
    "UYU": "ウルグアイ ペソ",
    "UZS": "ウズベキスタン スム",
    "VES": "ベネズエラ ボリバル",
    "VND": "ベトナム ドン",
    "VUV": "バヌアツ バツ",
    "WST": "サモア タラ",
    "XAF": "中央アフリカ CFA フラン",
    "XCD": "東カリブ ドル",
    "XCG": "XCG",
    "XDR": "特別引き出し権",
    "XOF": "西アフリカ CFA フラン",
    "XPF": "CFP フラン",
    "XSU": "スクレ",
    "YER": "イエメン リアル",
    "ZAR": "南アフリカ ランド",
    "ZMW": "ザンビア クワチャ",
    "ZWG": "ZWG",
    "ZWL": "ジンバブエ ドル (2009)"
  },
  "ko": {
    "USD": "미국 달러",
    "EUR": "유로",
    "GBP": "영국 파운드",
    "JPY": "일본 엔화",
    "CNY": "중국 위안화",
    "KRW": "대한민국 원",
    "AUD": "호주 달러",
    "CAD": "캐나다 달러",
    "HKD": "홍콩 달러",
    "SGD": "싱가포르 달러",
    "AED": "아랍에미리트 디르함",
    "AFN": "아프가니스탄 아프가니",
    "ALL": "알바니아 레크",
    "AMD": "아르메니아 드람",
    "ANG": "네덜란드령 안틸레스 길더",
    "AOA": "앙골라 콴자",
    "ARS": "아르헨티나 페소",
    "AWG": "아루바 플로린",
    "AZN": "아제르바이잔 마나트",
    "BAM": "보스니아-헤르체고비나 태환 마르크",
    "BBD": "바베이도스 달러",
    "BDT": "방글라데시 타카",
    "BGN": "불가리아 레프",
    "BHD": "바레인 디나르",
    "BIF": "부룬디 프랑",
    "BMD": "버뮤다 달러",
    "BND": "부루나이 달러",
    "BOB": "볼리비아 볼리비아노",
    "BRL": "브라질 레알",
    "BSD": "바하마 달러",
    "BTN": "부탄 눌투눔",
    "BWP": "보츠와나 풀라",
    "BYN": "벨라루스 루블",
    "BZD": "벨리즈 달러",
    "CDF": "콩고 프랑",
    "CHF": "스위스 프랑",
    "CLP": "칠레 페소",
    "COP": "콜롬비아 페소",
    "CRC": "코스타리카 콜론",
    "CUC": "쿠바 태환 페소",
    "CUP": "쿠바 페소",
    "CVE": "카보베르데 에스쿠도",
    "CZK": "체코 코루나",
    "DJF": "지부티 프랑",
    "DKK": "덴마크 크로네",
    "DOP": "도미니카 페소",
    "DZD": "알제리 디나르",
    "EGP": "이집트 파운드",
    "ERN": "에리트리아 나크파",
    "ETB": "에티오피아 비르",
    "FJD": "피지 달러",
    "FKP": "포클랜드제도 파운드",
    "GEL": "조지아 라리",
    "GHS": "가나 세디",
    "GIP": "지브롤터 파운드",
    "GMD": "감비아 달라시",
    "GNF": "기니 프랑",
    "GTQ": "과테말라 케트살",
    "GYD": "가이아나 달러",
    "HNL": "온두라스 렘피라",
    "HRK": "크로아티아 쿠나",
    "HTG": "아이티 구르드",
    "HUF": "헝가리 포린트",
    "IDR": "인도네시아 루피아",
    "ILS": "이스라엘 신권 세켈",
    "INR": "인도 루피",
    "IQD": "이라크 디나르",
    "IRR": "이란 리얄",
    "ISK": "아이슬란드 크로나",
    "JMD": "자메이카 달러",
    "JOD": "요르단 디나르",
    "KES": "케냐 실링",
    "KGS": "키르기스스탄 솜",
    "KHR": "캄보디아 리엘",
    "KMF": "코모르 프랑",
    "KPW": "조선 민주주의 인민 공화국 원",
    "KWD": "쿠웨이트 디나르",
    "KYD": "케이맨 제도 달러",
    "KZT": "카자흐스탄 텡게",
    "LAK": "라오스 키프",
    "LBP": "레바논 파운드",
    "LKR": "스리랑카 루피",
    "LRD": "라이베리아 달러",
    "LSL": "레소토 로티",
    "LYD": "리비아 디나르",
    "MAD": "모로코 디르함",
    "MDL": "몰도바 레이",
    "MGA": "마다가스카르 아리아리",
    "MKD": "마케도니아 디나르",
    "MMK": "미얀마 키얏",
    "MNT": "몽골 투그릭",
    "MOP": "마카오 파타카",
    "MRU": "모리타니 우기야",
    "MUR": "모리셔스 루피",
    "MVR": "몰디브 제도 루피아",
    "MWK": "말라위 콰차",
    "MXN": "멕시코 페소",
    "MYR": "말레이시아 링깃",
    "MZN": "모잠비크 메티칼",
    "NAD": "나미비아 달러",
    "NGN": "나이지리아 나이라",
    "NIO": "니카라과 코르도바",
    "NOK": "노르웨이 크로네",
    "NPR": "네팔 루피",
    "NZD": "뉴질랜드 달러",
    "OMR": "오만 리알",
    "PAB": "파나마 발보아",
    "PEN": "페루 솔",
    "PGK": "파푸아뉴기니 키나",
    "PHP": "필리핀 페소",
    "PKR": "파키스탄 루피",
    "PLN": "폴란드 즈워티",
    "PYG": "파라과이 과라니",
    "QAR": "카타르 리얄",
    "RON": "루마니아 레우",
    "RSD": "세르비아 디나르",
    "RUB": "러시아 루블",
    "RWF": "르완다 프랑",
    "SAR": "사우디아라비아 리얄",
    "SBD": "솔로몬 제도 달러",
    "SCR": "세이셸 루피",
    "SDG": "수단 파운드",
    "SEK": "스웨덴 크로나",
    "SHP": "세인트헬레나 파운드",
    "SLE": "시에라리온 리온",
    "SLL": "시에라리온 리온(1964~2022)",
    "SOS": "소말리아 실링",
    "SRD": "수리남 달러",
    "SSP": "남수단 파운드",
    "STN": "상투메 프린시페 도브라",
    "SVC": "엘살바도르 콜론",
    "SYP": "시리아 파운드",
    "SZL": "스와질란드 릴랑게니",
    "THB": "태국 바트",
    "TJS": "타지키스탄 소모니",
    "TMT": "투르크메니스탄 마나트",
    "TND": "튀니지 디나르",
    "TOP": "통가 파앙가",
    "TRY": "튀르키예 리라",
    "TTD": "트리니다드 토바고 달러",
    "TWD": "신 타이완 달러",
    "TZS": "탄자니아 실링",
    "UAH": "우크라이나 그리브나",
    "UGX": "우간다 실링",
    "UYU": "우루과이 페소",
    "UZS": "우즈베키스탄 숨",
    "VES": "베네수엘라 볼리바르",
    "VND": "베트남 동",
    "VUV": "바누아투 바투",
    "WST": "서 사모아 탈라",
    "XAF": "중앙아프리카 CFA 프랑",
    "XCD": "동카리브 달러",
    "XCG": "XCG",
    "XDR": "특별인출권",
    "XOF": "서아프리카 CFA 프랑",
    "XPF": "CFP 프랑",
    "XSU": "XSU",
    "YER": "예멘 리알",
    "ZAR": "남아프리카 랜드",
    "ZMW": "잠비아 콰차",
    "ZWG": "ZWG",
    "ZWL": "짐바브웨 달러 (2009)"
  },
  "en": {
    "USD": "US Dollar",
    "EUR": "Euro",
    "GBP": "British Pound",
    "JPY": "Japanese Yen",
    "CNY": "Chinese Yuan",
    "KRW": "South Korean Won",
    "AUD": "Australian Dollar",
    "CAD": "Canadian Dollar",
    "HKD": "Hong Kong Dollar",
    "SGD": "Singapore Dollar",
    "AED": "United Arab Emirates Dirham",
    "AFN": "Afghan Afghani",
    "ALL": "Albanian Lek",
    "AMD": "Armenian Dram",
    "ANG": "Netherlands Antillean Guilder",
    "AOA": "Angolan Kwanza",
    "ARS": "Argentine Peso",
    "AWG": "Aruban Florin",
    "AZN": "Azerbaijani Manat",
    "BAM": "Bosnia-Herzegovina Convertible Mark",
    "BBD": "Barbadian Dollar",
    "BDT": "Bangladeshi Taka",
    "BGN": "Bulgarian Lev",
    "BHD": "Bahraini Dinar",
    "BIF": "Burundian Franc",
    "BMD": "Bermudan Dollar",
    "BND": "Brunei Dollar",
    "BOB": "Bolivian Boliviano",
    "BRL": "Brazilian Real",
    "BSD": "Bahamian Dollar",
    "BTN": "Bhutanese Ngultrum",
    "BWP": "Botswanan Pula",
    "BYN": "Belarusian Ruble",
    "BZD": "Belize Dollar",
    "CDF": "Congolese Franc",
    "CHF": "Swiss Franc",
    "CLP": "Chilean Peso",
    "COP": "Colombian Peso",
    "CRC": "Costa Rican Colón",
    "CUC": "Cuban Convertible Peso",
    "CUP": "Cuban Peso",
    "CVE": "Cape Verdean Escudo",
    "CZK": "Czech Koruna",
    "DJF": "Djiboutian Franc",
    "DKK": "Danish Krone",
    "DOP": "Dominican Peso",
    "DZD": "Algerian Dinar",
    "EGP": "Egyptian Pound",
    "ERN": "Eritrean Nakfa",
    "ETB": "Ethiopian Birr",
    "FJD": "Fijian Dollar",
    "FKP": "Falkland Islands Pound",
    "GEL": "Georgian Lari",
    "GHS": "Ghanaian Cedi",
    "GIP": "Gibraltar Pound",
    "GMD": "Gambian Dalasi",
    "GNF": "Guinean Franc",
    "GTQ": "Guatemalan Quetzal",
    "GYD": "Guyanaese Dollar",
    "HNL": "Honduran Lempira",
    "HRK": "Croatian Kuna",
    "HTG": "Haitian Gourde",
    "HUF": "Hungarian Forint",
    "IDR": "Indonesian Rupiah",
    "ILS": "Israeli New Shekel",
    "INR": "Indian Rupee",
    "IQD": "Iraqi Dinar",
    "IRR": "Iranian Rial",
    "ISK": "Icelandic Króna",
    "JMD": "Jamaican Dollar",
    "JOD": "Jordanian Dinar",
    "KES": "Kenyan Shilling",
    "KGS": "Kyrgystani Som",
    "KHR": "Cambodian Riel",
    "KMF": "Comorian Franc",
    "KPW": "North Korean Won",
    "KWD": "Kuwaiti Dinar",
    "KYD": "Cayman Islands Dollar",
    "KZT": "Kazakhstani Tenge",
    "LAK": "Laotian Kip",
    "LBP": "Lebanese Pound",
    "LKR": "Sri Lankan Rupee",
    "LRD": "Liberian Dollar",
    "LSL": "Lesotho Loti",
    "LYD": "Libyan Dinar",
    "MAD": "Moroccan Dirham",
    "MDL": "Moldovan Leu",
    "MGA": "Malagasy Ariary",
    "MKD": "Macedonian Denar",
    "MMK": "Myanmar Kyat",
    "MNT": "Mongolian Tugrik",
    "MOP": "Macanese Pataca",
    "MRU": "Mauritanian Ouguiya",
    "MUR": "Mauritian Rupee",
    "MVR": "Maldivian Rufiyaa",
    "MWK": "Malawian Kwacha",
    "MXN": "Mexican Peso",
    "MYR": "Malaysian Ringgit",
    "MZN": "Mozambican Metical",
    "NAD": "Namibian Dollar",
    "NGN": "Nigerian Naira",
    "NIO": "Nicaraguan Córdoba",
    "NOK": "Norwegian Krone",
    "NPR": "Nepalese Rupee",
    "NZD": "New Zealand Dollar",
    "OMR": "Omani Rial",
    "PAB": "Panamanian Balboa",
    "PEN": "Peruvian Sol",
    "PGK": "Papua New Guinean Kina",
    "PHP": "Philippine Peso",
    "PKR": "Pakistani Rupee",
    "PLN": "Polish Zloty",
    "PYG": "Paraguayan Guarani",
    "QAR": "Qatari Riyal",
    "RON": "Romanian Leu",
    "RSD": "Serbian Dinar",
    "RUB": "Russian Ruble",
    "RWF": "Rwandan Franc",
    "SAR": "Saudi Riyal",
    "SBD": "Solomon Islands Dollar",
    "SCR": "Seychellois Rupee",
    "SDG": "Sudanese Pound",
    "SEK": "Swedish Krona",
    "SHP": "St. Helena Pound",
    "SLE": "Sierra Leonean Leone",
    "SLL": "Sierra Leonean Leone (1964—2022)",
    "SOS": "Somali Shilling",
    "SRD": "Surinamese Dollar",
    "SSP": "South Sudanese Pound",
    "STN": "São Tomé & Príncipe Dobra",
    "SVC": "Salvadoran Colón",
    "SYP": "Syrian Pound",
    "SZL": "Swazi Lilangeni",
    "THB": "Thai Baht",
    "TJS": "Tajikistani Somoni",
    "TMT": "Turkmenistani Manat",
    "TND": "Tunisian Dinar",
    "TOP": "Tongan Paʻanga",
    "TRY": "Turkish Lira",
    "TTD": "Trinidad & Tobago Dollar",
    "TWD": "New Taiwan Dollar",
    "TZS": "Tanzanian Shilling",
    "UAH": "Ukrainian Hryvnia",
    "UGX": "Ugandan Shilling",
    "UYU": "Uruguayan Peso",
    "UZS": "Uzbekistani Som",
    "VES": "Venezuelan Bolívar",
    "VND": "Vietnamese Dong",
    "VUV": "Vanuatu Vatu",
    "WST": "Samoan Tala",
    "XAF": "Central African CFA Franc",
    "XCD": "East Caribbean Dollar",
    "XCG": "Caribbean guilder",
    "XDR": "Special Drawing Rights",
    "XOF": "West African CFA Franc",
    "XPF": "CFP Franc",
    "XSU": "Sucre",
    "YER": "Yemeni Rial",
    "ZAR": "South African Rand",
    "ZMW": "Zambian Kwacha",
    "ZWG": "Zimbabwean Gold",
    "ZWL": "Zimbabwean Dollar (2009–2024)"
  }
};

module.exports = {
  CURRENCY_CODES,
  CURRENCY_METADATA,
  CURRENCY_NAMES
};
