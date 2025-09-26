const DEFAULT_TIME_OPTIONS = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
const DEFAULT_DATE_OPTIONS = { year: 'numeric', month: '2-digit', day: '2-digit' };

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  throw new TypeError('Invalid date value');
}

export function formatTime(value, { locale = 'en-US', timeZone, hour12 } = {}) {
  const date = toDate(value);
  const formatter = new Intl.DateTimeFormat(locale, {
    ...DEFAULT_TIME_OPTIONS,
    timeZone,
    hour12
  });
  return formatter.format(date);
}

export function formatDate(value, { locale = 'en-US', timeZone } = {}) {
  const date = toDate(value);
  const formatter = new Intl.DateTimeFormat(locale, {
    ...DEFAULT_DATE_OPTIONS,
    timeZone
  });
  return formatter.format(date);
}

export function formatDateTime(value, { locale = 'en-US', timeZone, hour12 } = {}) {
  const date = toDate(value);
  const formatter = new Intl.DateTimeFormat(locale, {
    ...DEFAULT_DATE_OPTIONS,
    ...DEFAULT_TIME_OPTIONS,
    timeZone,
    hour12
  });
  return formatter.format(date);
}
