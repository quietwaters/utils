const winston = require('winston');
const util = require('util');

/**
 * Log utility that wraps winston for consistent logging
 * Assumes winston is available in the consuming project
 */

let rootLogger;
let transportFactory;

function getTransportFactory() {
  if (!transportFactory) {
    transportFactory = () => [
      new winston.transports.Console()
    ];
  }
  return transportFactory;
}

function formatValue(value) {
  if (value instanceof Error) {
    return value.stack || value.message;
  }
  if (typeof value === 'object' && value !== null) {
    const inspected = util.inspect(value, { depth: null, breakLength: Infinity });
    return inspected
      .replace(/^{\s+/, '{')
      .replace(/\s+}$/, '}')
      .replace(/^\[\s+/, '[')
      .replace(/\s+\]$/, ']');
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

// Create root logger with default configuration
function createRootLogger() {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: () => new Date().toISOString() }),
      winston.format.printf((info) => {
        const { timestamp, level } = info;
        const messageValue = formatValue(info.message);
        const splat = info[Symbol.for('splat')] || [];

        // Extract context fields (those set via getLogger)
        const contextParts = [];
        for (const [key, value] of Object.entries(info)) {
          if (['timestamp', 'level', 'message'].includes(key)) {
            continue;
          }
          if (value !== undefined && value !== null) {
            contextParts.push(`${key}: ${value}`);
          }
        }

        const contextStr = contextParts.join(' ');

        const formattedExtras = splat
          .map((value) => formatValue(value))
          .filter((part) => part.length > 0);

        const messageParts = [messageValue, ...formattedExtras].filter((part) => part.length > 0);
        const messageStr = messageParts.join(' ');

        const header = `${timestamp} [${level.toUpperCase()}]`;
        const contextSegment = contextStr ? ` ${contextStr}` : '';
        const messageSegment = messageStr ? `${contextStr ? ' - ' : ' '}${messageStr}` : '';

        return `${header}${contextSegment}${messageSegment}`;
      })
    ),
    transports: getTransportFactory()()
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
  },

  // Test hooks
  __setTransportFactory(factory) {
    transportFactory = factory;
    rootLogger = undefined;
  },

  __reset() {
    transportFactory = undefined;
    rootLogger = undefined;
  }
};

module.exports = {
  log
};
