const { sleep } = require('../time');

function defaultBackoff(attempt) {
  const base = 2000 * Math.pow(2, attempt);
  return Math.min(base, 8000);
}

function isRetryableError(err) {
  if (!err) return false;
  const status = err.status;
  if (typeof status === 'number' && (status === 429 || (status >= 500 && status < 600))) {
    return true;
  }
  const name = err.name || '';
  const code = err.code || '';
  return name === 'AbortError' || code === 'ECONNRESET' || code === 'ETIMEDOUT';
}

async function withTimeout(promiseOrFn, timeoutMs, errorMessage) {
  const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(errorMessage || 'Operation timed out');
      error.code = 'ETIMEDOUT';
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(fn, { maxRetries = 0, isRetryable = isRetryableError, backoff = defaultBackoff } = {}) {
  let attempt = 0;
  let lastError;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !isRetryable(error)) {
        break;
      }
      await sleep(backoff(attempt));
      attempt += 1;
    }
  }
  throw lastError;
}

module.exports = {
  defaultBackoff,
  isRetryableError,
  withTimeout,
  withRetry
};
