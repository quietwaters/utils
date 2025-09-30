const winston = require('winston');

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
        const contextParts = [];

        // Build context string with key: value format
        for (const [key, value] of Object.entries(meta)) {
          if (value !== undefined && value !== null && key !== 'splat') {
            contextParts.push(`${key}: ${value}`);
          }
        }

        const contextStr = contextParts.length ? contextParts.join(' ') : '';
        const separator = contextStr ? ' - ' : '';

        return `${timestamp} [${level.toUpperCase()}] ${contextStr}${separator}${message}`;
      })
    ),
    transports: [
      new winston.transports.Console()
    ]
  });
}

const log = {
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

module.exports = {
  log
};
