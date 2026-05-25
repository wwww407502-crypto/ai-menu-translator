const { toTrimmedString } = require('./utils');

function inferSourceLanguage(items = []) {
    const sourceText = items
        .map((item) => item.originalName || '')
        .join(' ');

    if (/[ぁ-ゟ゠-ヿ]/.test(sourceText)) return 'ja';
    if (/[가-힣]/.test(sourceText)) return 'ko';
    if (/[\u0E00-\u0E7F]/.test(sourceText)) return 'th';
    if (/[\u0600-\u06FF]/.test(sourceText) && /[پچژگ]/.test(sourceText)) return 'fa';
    if (/[\u0600-\u06FF]/.test(sourceText)) return 'ar';
    if (/[\u0900-\u097F]/.test(sourceText)) return 'hi';
    if (/[\u0980-\u09FF]/.test(sourceText)) return 'bn';
    if (/[\u0400-\u04FF]/.test(sourceText)) return 'ru';
    if (/[ơưƠƯăâêôđĂÂÊÔĐ]/.test(sourceText)) return 'vi';
    if (/[ğşĞŞıİ]/.test(sourceText)) return 'tr';
    if (/[A-Za-z]/.test(sourceText) && !/[\u4e00-\u9fff]/.test(sourceText)) return 'en';
    if (/[\u3100-\u312F\u31A0-\u31BF]/.test(sourceText)) return 'zh-TW';
    if (/[\u4e00-\u9fff]/.test(sourceText)) return 'zh-CN';
    return 'en';
}

function inferSourceLanguageFromText(sourceText = '') {
    const text = toTrimmedString(sourceText);
    if (!text) return 'unknown';

    if (/[ぁ-ゟ゠-ヿ]/.test(text)) return 'ja';
    if (/[가-힣]/.test(text)) return 'ko';
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
    if (/[\u0600-\u06FF]/.test(text) && /[پچژگ]/.test(text)) return 'fa';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    if (/[ơưƠƯăâêôđĂÂÊÔĐ]/.test(text)) return 'vi';
    if (/[ğşĞŞıİ]/.test(text)) return 'tr';
    if (/[A-Za-z]/.test(text) && !/[\u4e00-\u9fff]/.test(text)) return 'en';
    if (/[\u3100-\u312F\u31A0-\u31BF]/.test(text)) return 'zh-TW';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh-CN';
    return 'unknown';
}

module.exports = {
    inferSourceLanguage,
    inferSourceLanguageFromText
};
