const { OpenAI } = require('openai');
const {
    dashscopeApiKey,
    dashscopeBaseURL,
    parseTimeoutMs,
    modelMaxRetries,
    modelConnectionRetryCount,
    modelMaxTokens
} = require('../config');
const {
    HttpError,
    UpstreamServiceError
} = require('../errors');
const {
    toTrimmedString,
    stripMarkdownCodeFences,
    isTimeoutError,
    isRetriableUpstreamConnectionError,
    extractUpstreamErrorDetails
} = require('../lib/utils');

let openaiClient = null;

function getOpenAIClient() {
    if (!dashscopeApiKey) {
        throw new HttpError(
            503,
            'AI_PROVIDER_NOT_CONFIGURED',
            'AI provider API key is not configured. Set DASHSCOPE_API_KEY or OPENAI_API_KEY.'
        );
    }

    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: dashscopeApiKey,
            baseURL: dashscopeBaseURL,
            timeout: parseTimeoutMs,
            maxRetries: Number.isFinite(modelMaxRetries) && modelMaxRetries >= 0 ? modelMaxRetries : 0
        });
    }

    return openaiClient;
}

function resetOpenAIClient() {
    openaiClient = null;
}

async function requestTextCompletion(messages, model, options = {}) {
    const extraBody = {};
    if (typeof options.enableThinking === 'boolean') {
        extraBody.enable_thinking = options.enableThinking;
    }
    if (Number.isFinite(options.thinkingBudget) && options.thinkingBudget > 0) {
        extraBody.thinking_budget = Number(options.thinkingBudget);
    }

    const timeout = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
        ? Number(options.timeoutMs)
        : parseTimeoutMs;
    const debugLabel = toTrimmedString(options.debugLabel) || 'model_request';
    const requestId = toTrimmedString(options.requestId) || 'unknown';
    const startedAt = Date.now();

    const maxTokens = Number.isFinite(options.maxTokens)
        ? Number(options.maxTokens)
        : modelMaxTokens;
    const totalAttempts = 1 + modelConnectionRetryCount;

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
        try {
            console.log('[model:start]', {
                requestId,
                debugLabel,
                model,
                attempt,
                totalAttempts,
                timeoutMs: timeout,
                enableThinking: Object.prototype.hasOwnProperty.call(extraBody, 'enable_thinking') ? extraBody.enable_thinking : null,
                thinkingBudget: Object.prototype.hasOwnProperty.call(extraBody, 'thinking_budget') ? extraBody.thinking_budget : null
            });
            const completion = await getOpenAIClient().chat.completions.create({
                model,
                temperature: 0,
                messages,
                ...(Number.isFinite(maxTokens) && maxTokens > 0 ? { max_tokens: maxTokens } : {}),
                ...(Object.keys(extraBody).length ? { extra_body: extraBody } : {})
            }, {
                timeout
            });

            const content = stripMarkdownCodeFences(completion.choices[0].message.content || '');
            if (!content) {
                throw new UpstreamServiceError('Model returned an empty response.', 'EMPTY_MODEL_RESPONSE');
            }
            console.log('[model:done]', {
                requestId,
                debugLabel,
                model,
                attempt,
                totalAttempts,
                durationMs: Date.now() - startedAt,
                outputChars: content.length
            });
            return content;
        } catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }

            if (isTimeoutError(error)) {
                const details = extractUpstreamErrorDetails(error);
                console.error('[model:timeout]', {
                    requestId,
                    debugLabel,
                    model,
                    attempt,
                    totalAttempts,
                    durationMs: Date.now() - startedAt,
                    ...details
                });
                throw new UpstreamServiceError('Model request timed out.', 'UPSTREAM_TIMEOUT', details, 504);
            }

            const details = extractUpstreamErrorDetails(error);
            const shouldRetry = attempt < totalAttempts && isRetriableUpstreamConnectionError(error);
            console.error('[model:failed]', {
                requestId,
                debugLabel,
                model,
                attempt,
                totalAttempts,
                willRetry: shouldRetry,
                durationMs: Date.now() - startedAt,
                ...details
            });

            if (shouldRetry) {
                resetOpenAIClient();
                continue;
            }

            throw new UpstreamServiceError('Model request failed.', 'UPSTREAM_FAILURE', details);
        }
    }
}

async function requestJsonCompletion(messages, options = {}) {
    const rawContent = await requestTextCompletion(messages, options.model, options);
    try {
        return JSON.parse(stripMarkdownCodeFences(rawContent));
    } catch (error) {
        throw new UpstreamServiceError('Model returned invalid JSON.', 'INVALID_MODEL_RESPONSE', {
            contentPreview: rawContent.slice(0, 500)
        });
    }
}

async function requestTextCompletionSafe(messages, options = {}) {
    try {
        const rawContent = await requestTextCompletion(messages, options.model, options);
        const cleaned = stripMarkdownCodeFences(rawContent);
        try {
            return { ok: true, json: JSON.parse(cleaned), rawText: rawContent };
        } catch (parseError) {
            return { ok: false, json: null, rawText: rawContent, parseError: parseError.message };
        }
    } catch (error) {
        if (error instanceof UpstreamServiceError) {
            return { ok: false, json: null, rawText: null, upstreamError: error.message, upstreamCode: error.errorCode };
        }
        throw error;
    }
}

module.exports = {
    getOpenAIClient,
    resetOpenAIClient,
    requestTextCompletion,
    requestJsonCompletion,
    requestTextCompletionSafe
};
