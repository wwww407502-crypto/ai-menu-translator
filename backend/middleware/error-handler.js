const multerModule = require('multer');
const { HttpError } = require('../errors');

function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        next(error);
        return;
    }

    if (error instanceof multerModule.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({
                error: 'Uploaded image is too large.',
                code: 'FILE_TOO_LARGE',
                requestId: req.requestId
            });
            return;
        }

        res.status(400).json({
            error: 'Invalid multipart upload.',
            code: 'INVALID_MULTIPART_UPLOAD',
            requestId: req.requestId
        });
        return;
    }

    if (error instanceof HttpError) {
        const payload = {
            error: error.message,
            code: error.errorCode,
            requestId: req.requestId
        };
        if (error.details) {
            payload.details = error.details;
        }
        res.status(error.statusCode).json(payload);
        return;
    }

    console.error('Unhandled backend error:', {
        requestId: req.requestId,
        message: error && error.message,
        code: error && error.code,
        stack: error && error.stack
    });
    res.status(500).json({
        error: 'Internal server error.',
        code: 'INTERNAL_SERVER_ERROR',
        requestId: req.requestId
    });
}

module.exports = errorHandler;
