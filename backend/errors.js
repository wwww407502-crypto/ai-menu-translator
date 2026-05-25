class HttpError extends Error {
    constructor(statusCode, errorCode, message, details = undefined) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
    }
}

class UpstreamServiceError extends HttpError {
    constructor(message, errorCode = 'UPSTREAM_FAILURE', details = undefined, statusCode = 502) {
        super(statusCode, errorCode, message, details);
        this.name = 'UpstreamServiceError';
    }
}

module.exports = {
    HttpError,
    UpstreamServiceError
};
