import crypto from 'node:crypto';
import winston from 'winston';

/**
 * Standard success response
 * @param {any} data - The data to include in the success response
 * @return {Object}
 */
export function makeSuccess(data) {
  return { success: true, data };
}

/**
 * @param {string|number} code - Error code (for programme read)
 * @param {string} message - Error message (for human read)
 * @param {any} [data=null] - Additional error data
 * @return {Object}
 */
export function makeError(code, message, data) {
  const result = {success: false};

  if(!isNil(code)){
    if(!result.error){
      result.error = {};
    }
    result.error.code = code;
  }

  if(!isNil(message)){
    if(!result.error){
      result.error = {};
    }
    result.error.message = message;
  }

  if(!isNil(data)){
    result.data = data;
  }

  return result;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function defaultBackoff(attempt) {
  const base = 2000 * Math.pow(2, attempt);
  return Math.min(base, 8000);
}

export function generateId(prefix = '') {
  const ts = Date.now().toString(16);
  let rand = '';
  try {
    rand = crypto.randomBytes(6).toString('hex');
  } catch (_) {
    rand = Math.random().toString(16).slice(2, 14);
  }

  return `${prefix}${ts}-${rand}`;
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

export async function withTimeout(promiseOrFn, timeoutMs, errorMessage) {
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

export function maskString(str) {
  if(isNil(str)){
    return '';
  }

  str = str.toString();

  if(str == ''){
    return str;
  }

  const maskPercentage = 0.7;
  const maxShownLength = 10;

  const len = str.length;

  // For very short strings, ensure at least some characters are shown
  let shownLength = Math.max(1, Math.floor(len * (1 - maskPercentage)));

  // Apply maximum shown length limit
  if(shownLength > maxShownLength){
    shownLength = maxShownLength;
  }

  // For single character, mask completely
  if(len === 1) {
    return '*';
  }

  // Ensure we don't show more characters than the string length
  if(shownLength >= len) {
    shownLength = Math.max(1, len - 1);
  }

  let leftLength, rightLength;
  if(shownLength % 2 === 0){
    leftLength = shownLength / 2;
    rightLength = leftLength;
  } else {
    // When odd number of shown chars, show more on the right
    leftLength = Math.floor(shownLength / 2);
    rightLength = shownLength - leftLength;
  }

  // Handle edge case where rightLength would be 0
  if(rightLength === 0 && len > 1) {
    rightLength = 1;
    leftLength = Math.max(0, shownLength - rightLength);
  }

  const maskedLength = len - shownLength;
  return `${str.slice(0, leftLength)}${'*'.repeat(maskedLength)}${str.slice(-rightLength)}`;
}

export function toBoolean(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;

  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return false;
}

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
        case Number:
          parsedValue = Number(originalValue);
          break;
        case Boolean:
          parsedValue = toBoolean(originalValue);
          break;
        default:
          parsedValue = String(originalValue);
          break;
      }
    }

    if(envDef.required && (isNil(parsedValue) || (envDef.type === Number && isNaN(parsedValue)) || parsedValue === '')){
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

/**
 * Log utility that wraps winston for consistent logging
 * Assumes winston is available in the consuming project
 */

let rootLogger;

// Create root logger with default configuration
function createRootLogger() {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: () => new Date().toISOString() }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // Extract context fields (those set via getLogger)
        const contextFields = [];
        const remainingMeta = {};

        // Separate context fields from other meta
        for (const [key, value] of Object.entries(meta)) {
          if (value !== undefined && value !== null) {
            contextFields.push(value);
          } else {
            remainingMeta[key] = value;
          }
        }

        const contextStr = contextFields.length ? contextFields.join(' ') : 'N/A';
        const metaStr = Object.keys(remainingMeta).length ? ` ${JSON.stringify(remainingMeta)}` : '';

        return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${metaStr}`;
      })
    ),
    transports: [
      new winston.transports.Console()
    ]
  });
}

export const log = {
  set level(level) {
    if (!rootLogger) {
      rootLogger = createRootLogger();
    }
    rootLogger.level = level;
  },

  get level() {
    if (!rootLogger) {
      rootLogger = createRootLogger();
    }
    return rootLogger.level;
  },

  getLogger(options = {}) {
    if (!rootLogger) {
      rootLogger = createRootLogger();
    }

    return rootLogger.child(options);
  }
};

export default {
  // response
  makeSuccess,
  makeError,

  // util
  generateId,
  sleep,
  startTimer,
  maskString,
  toBoolean,
  isNil,

  // retry and timeout handling
  defaultBackoff,
  isRetryableError,
  withTimeout,
  withRetry,

  // env
  readEnv,

  // logging
  log,
};
