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

export function isNil(val){
  return val === undefined || val === null;
}

export function readEnv(envParams, envValues){
  const result = {};
  const invalidEnvs = [];

  Object.keys(envParams).forEach((envName) => {
    const originalValue = envValues[envName];
    let parsedValue;

    const envDef = envParams[envName];

    if(isNil(originalValue)){
      parsedValue = envDef.defaultValue;
    } else {
      switch(envDef.type){
        case String:
          parsedValue = String(originalValue);
          break;
        case Number:
          parsedValue = Number(originalValue);
          break;
        case Boolean:
          parsedValue = toBoolean(originalValue);
          break;
        default:
          parsedValue = envDef.func && envDef.func(originalValue);
          break;
      }
    }

    if(envDef.required && (isNil(parsedValue) || (envDef.type === Number && isNaN(parsedValue)))){
      invalidEnvs.push({name: envName, value: parsedValue});
    } else {
      result[envName] = parsedValue;
    }
  });

  if(invalidEnvs.length > 0){
    throw new Error('invalid env', {cause: invalidEnvs});
  }

  return result;
}

export function formatTime(input, { includeTime = true, timezone = 'UTC' } = {}) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  if (timezone === 'UTC') {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    if (!includeTime) return `${y}-${m}-${d}`;
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  // Use Intl.DateTimeFormat for other timezones
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const datePart = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;

  if (!includeTime) return datePart;

  const timePart = `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}`;
  return `${datePart} ${timePart}`;
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
  readEnv,
  formatTime,
};
