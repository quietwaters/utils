import crypto from 'node:crypto';

// ---- Response helpers ----------------------------------------------------
export function makeSuccess(data = null, options = {}) {
  const { includeErrorField = false } = options;
  const payload = { success: true, data };
  if (includeErrorField) {
    payload.error = null;
  }
  return payload;
}

export function makeError(code, message, data = null) {
  return { success: false, error: { code, message }, data };
}

// ---- Identifier helpers --------------------------------------------------
export function generateRequestId(prefix = 'req') {
  const safePrefix = typeof prefix === 'string' && prefix.trim() ? prefix.trim() : 'req';
  const timestamp = Date.now().toString(16);
  const randomPart = Math.random().toString(16).slice(2, 10);
  return `${safePrefix}_${timestamp}_${randomPart}`;
}

export function createTimeId() {
  const ts = Date.now().toString(16);
  let rand = '';
  try {
    rand = crypto.randomBytes(6).toString('hex');
  } catch (_) {
    rand = Math.random().toString(16).slice(2, 14);
  }
  return `${ts}-${rand}`;
}

// ---- Timing helpers ------------------------------------------------------
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function defaultBackoff(attempt) {
  const base = 2000 * Math.pow(2, attempt);
  return Math.min(base, 8000);
}

export function isRetryableError(err) {
  if (!err) return false;
  const status = err.status;
  if (typeof status === 'number' && (status === 429 || (status >= 500 && status < 600))) {
    return true;
  }
  const name = err.name || '';
  const code = err.code || '';
  return name === 'AbortError' || code === 'ECONNRESET' || code === 'ETIMEDOUT';
}

export async function withTimeout(promiseOrFn, timeoutMs) {
  const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('Operation timed out');
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

export async function withRetry(fn, { maxRetries = 0, isRetryable = isRetryableError, backoff = defaultBackoff } = {}) {
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

export function startTimer() {
  const startTime = Date.now();
  return {
    end() {
      return Date.now() - startTime;
    }
  };
}

export function maskString(str, { reveal = false } = {}) {
  const text = typeof str === 'string' ? str : '';
  if (!text) return '';
  if (reveal) return text;

  const totalLen = text.length;
  if (totalLen <= 2) return '*'.repeat(totalLen);

  // Calculate 80% mask length
  const maskLen = Math.ceil(totalLen * 0.8);
  const keepLen = totalLen - maskLen;

  // Split keep length between head and tail, max 4 each
  const headLen = Math.min(4, Math.ceil(keepLen / 2));
  const tailLen = Math.min(4, keepLen - headLen);

  const head = text.slice(0, headLen);
  const tail = tailLen > 0 ? text.slice(-tailLen) : '';
  const actualMaskLen = totalLen - headLen - tailLen;

  return `${head}${'*'.repeat(actualMaskLen)}${tail}`;
}

// ---- String helpers ------------------------------------------------------
// export function normalizeString(value, { fallback = '', trim = true, maxLength = 5000 } = {}) {
//   if (value === undefined || value === null) return fallback;
//   if (typeof value !== 'string') return fallback;
//   const text = trim ? value.trim() : value;
//   if (!text) return fallback;
//   if (maxLength && text.length > maxLength) {
//     return text.slice(0, maxLength);
//   }
//   return text;
// }

// export function safeString(value, fallback = '') {
//   return typeof value === 'string' ? value : fallback;
// }

export function toBoolean(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;

  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return false;
}

// ---- Numeric helpers -----------------------------------------------------
// export function toNumber(value, fallback = undefined) {
//   const n = Number(value);
//   return Number.isFinite(n) ? n : fallback;
// }

// export function toInt(value, fallback = undefined) {
//   const n = Number(value);
//   return Number.isInteger(n) ? n : fallback;
// }

// export function compactWhitespace(text, { trim = true } = {}) {
//   const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ') : '';
//   return trim ? normalized.trim() : normalized;
// }

// export function createPreview(text, { maxLength = 120, trim = true } = {}) {
//   const base = compactWhitespace(text, { trim });
//   if (!maxLength || maxLength < 0) return base;
//   return base.slice(0, maxLength);
// }

function isNil(val){
  return val === undefined || val === null;
}

export default {
  makeSuccess,
  makeError,
  generateRequestId,
  createTimeId,
  sleep,
  defaultBackoff,
  isRetryableError,
  withTimeout,
  withRetry,
  startTimer,
  maskString,
  toBoolean,
  isNil,
};
