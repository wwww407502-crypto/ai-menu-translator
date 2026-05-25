const { HttpError } = require('../errors');
const { maxConcurrentParses } = require('../config');

let activeParseRequests = 0;

function enforceParseConcurrency(req, res, next) {
    if (activeParseRequests >= maxConcurrentParses) {
        next(new HttpError(503, 'PARSE_CAPACITY_EXCEEDED', 'Menu parsing service is busy. Please retry shortly.'));
        return;
    }

    activeParseRequests += 1;
    let released = false;
    const release = () => {
        if (released) {
            return;
        }
        released = true;
        activeParseRequests = Math.max(0, activeParseRequests - 1);
    };

    res.on('finish', release);
    res.on('close', release);
    next();
}

function resetParseConcurrency() {
    activeParseRequests = 0;
}

module.exports = {
    enforceParseConcurrency,
    resetParseConcurrency
};
