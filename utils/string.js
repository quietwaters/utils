// ---- String helpers ------------------------------------------------------
export function normalizeString(value, { fallback = '', trim = true, maxLength = 5000 } = {}) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') return fallback;
  const text = trim ? value.trim() : value;
  if (!text) return fallback;
  if (maxLength && text.length > maxLength) {
    return text.slice(0, maxLength);
  }
  return text;
}

export function safeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

// ---- Numeric helpers -----------------------------------------------------
export function toNumber(value, fallback = undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toInt(value, fallback = undefined) {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
}

export function compactWhitespace(text, { trim = true } = {}) {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ') : '';
  return trim ? normalized.trim() : normalized;
}

export function createPreview(text, { maxLength = 120, trim = true } = {}) {
  const base = compactWhitespace(text, { trim });
  if (!maxLength || maxLength < 0) return base;
  return base.slice(0, maxLength);
}