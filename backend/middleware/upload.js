const multer = require('multer');
const { HttpError } = require('../errors');
const { supportedImageMimeTypes, maxUploadBytes } = require('../config');

function normalizeUploadedMimeType(value) {
    if (typeof value !== 'string') return '';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'image/jpg') {
        return 'image/jpeg';
    }
    return normalized;
}

function detectImageMimeType(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        return null;
    }

    if (
        buffer.length >= 8
        && buffer[0] === 0x89
        && buffer[1] === 0x50
        && buffer[2] === 0x4e
        && buffer[3] === 0x47
        && buffer[4] === 0x0d
        && buffer[5] === 0x0a
        && buffer[6] === 0x1a
        && buffer[7] === 0x0a
    ) {
        return 'image/png';
    }

    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }

    if (
        buffer.length >= 12
        && buffer.toString('ascii', 0, 4) === 'RIFF'
        && buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return 'image/webp';
    }

    return null;
}

function validateUploadedImage(file) {
    if (!file) {
        throw new HttpError(400, 'IMAGE_REQUIRED', 'No image uploaded.');
    }

    const declaredMimeType = normalizeUploadedMimeType(file.mimetype);
    if (!supportedImageMimeTypes.has(declaredMimeType)) {
        throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, and WEBP images are supported.');
    }

    const detectedMimeType = detectImageMimeType(file.buffer);
    if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
        throw new HttpError(415, 'INVALID_IMAGE_CONTENT', 'Uploaded file is not a valid supported image.');
    }
}

function createUploadMiddleware() {
    const storage = multer.memoryStorage();
    return multer({
        storage,
        limits: {
            fileSize: maxUploadBytes,
            files: 1
        },
        fileFilter: (req, file, callback) => {
            const mimeType = normalizeUploadedMimeType(file.mimetype);
            if (!supportedImageMimeTypes.has(mimeType)) {
                callback(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, and WEBP images are supported.'));
                return;
            }
            callback(null, true);
        }
    });
}

module.exports = {
    normalizeUploadedMimeType,
    detectImageMimeType,
    validateUploadedImage,
    createUploadMiddleware
};
