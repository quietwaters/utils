import winston from 'winston';

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

export {
  log
};
