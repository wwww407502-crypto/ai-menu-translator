const { HttpError } = require('../errors');
const { toTrimmedString } = require('../lib/utils');
const { allowedTargetLanguages } = require('../config');

function ensureAllowedTargetLanguage(value) {
    const normalized = toTrimmedString(value) || 'zh-CN';
    if (!allowedTargetLanguages.has(normalized)) {
        throw new HttpError(400, 'INVALID_TARGET_LANGUAGE', 'Unsupported targetLang.');
    }
    return normalized;
}

module.exports = {
    ensureAllowedTargetLanguage
};
