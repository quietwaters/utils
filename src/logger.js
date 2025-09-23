// ---- Logging -------------------------------------------------------------
export function nowISOString() {
  return new Date().toISOString();
}

export function logWithTime(level, message, payload) {
  const ts = nowISOString();
  const text = ts ? `[${ts}] ${message}` : message;
  const logger = typeof level === 'string' && console[level] ? console[level] : console.log;
  if (typeof payload === 'undefined') {
    logger.call(console, text);
    return;
  }
  logger.call(console, text, payload);
}

export function createTimedLogger(levels = ['info', 'warn', 'error', 'debug']) {
  return levels.reduce((acc, level) => {
    acc[level] = (message, payload) => logWithTime(level, message, payload);
    return acc;
  }, {});
}

export const logger = createTimedLogger(['info', 'warn', 'error', 'debug']);