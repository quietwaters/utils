const winston = require('winston');
const { Writable } = require('stream');

// Helper function to create a logger with captured output
function createTestLogger(options = {}) {
  const output = [];

  const captureStream = new Writable({
    write(chunk, encoding, callback) {
      output.push(chunk.toString().trim());
      callback();
    }
  });

  const logger = winston.createLogger({
    level: options.level || 'info',
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
      new winston.transports.Stream({ stream: captureStream })
    ]
  });

  return { logger, output };
}

describe('Log module', () => {

  test('should format log with level in brackets', () => {
    const { logger, output } = createTestLogger();
    logger.info('Test message');

    expect(output[0]).toMatch(/\[INFO\]/);
  });

  test('should format log with context fields', () => {
    const { logger, output } = createTestLogger();
    const childLogger = logger.child({ requestId: 'abc123', userId: 'user456' });
    childLogger.info('Test message');

    expect(output[0]).toContain('requestId: abc123');
    expect(output[0]).toContain('userId: user456');
  });

  test('should separate context and message with " - "', () => {
    const { logger, output } = createTestLogger();
    const childLogger = logger.child({ requestId: 'abc123' });
    childLogger.info('Test message');

    expect(output[0]).toMatch(/requestId: abc123 - Test message/);
  });

  test('should not add separator when no context fields', () => {
    const { logger, output } = createTestLogger();
    logger.info('Test message');

    expect(output[0]).not.toContain(' - ');
    expect(output[0]).toContain('Test message');
  });

  test('should handle multiple log levels', () => {
    const { logger, output } = createTestLogger();
    const childLogger = logger.child({ requestId: 'abc123' });

    childLogger.error('Error message');
    childLogger.warn('Warning message');
    childLogger.info('Info message');
    childLogger.debug('Debug message');

    expect(output[0]).toContain('[ERROR]');
    expect(output[1]).toContain('[WARN]');
    expect(output[2]).toContain('[INFO]');
    // Debug won't appear because default level is 'info'
    expect(output).toHaveLength(3);
  });

  test('should include timestamp in ISO format', () => {
    const { logger, output } = createTestLogger();
    logger.info('Test message');

    // Check for ISO timestamp pattern (YYYY-MM-DDTHH:mm:ss.sssZ)
    expect(output[0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });

  test('should respect log level when filtering messages', () => {
    const { logger, output } = createTestLogger({ level: 'error' });

    logger.debug('Debug message');
    logger.info('Info message');
    logger.error('Error message');

    // Only error message should appear
    expect(output).toHaveLength(1);
    expect(output[0]).toContain('[ERROR]');
    expect(output[0]).toContain('Error message');
  });

  test('should handle multiple context fields in order', () => {
    const { logger, output } = createTestLogger();
    const childLogger = logger.child({
      requestId: 'req123',
      userId: 'user456',
      sessionId: 'sess789'
    });
    childLogger.info('Test message');

    const line = output[0];
    expect(line).toContain('requestId: req123');
    expect(line).toContain('userId: user456');
    expect(line).toContain('sessionId: sess789');
    expect(line).toMatch(/requestId: req123.*userId: user456.*sessionId: sess789 - Test message/);
  });

  test('should handle empty context object', () => {
    const { logger, output } = createTestLogger();
    const childLogger = logger.child({});
    childLogger.info('Test message');

    expect(output[0]).not.toContain(' - ');
    expect(output[0]).toContain('Test message');
  });

  test('should ignore undefined and null context values', () => {
    const { logger, output } = createTestLogger();
    const childLogger = logger.child({
      requestId: 'abc123',
      undefinedField: undefined,
      nullField: null,
      validField: 'valid'
    });
    childLogger.info('Test message');

    const line = output[0];
    expect(line).toContain('requestId: abc123');
    expect(line).toContain('validField: valid');
    expect(line).not.toContain('undefinedField');
    expect(line).not.toContain('nullField');
  });

  test('complete format: timestamp [LEVEL] context - message', () => {
    const { logger, output } = createTestLogger();
    const childLogger = logger.child({ requestId: 'abc123', userId: 'user456' });
    childLogger.info('User logged in');

    const line = output[0];
    // Check complete format structure
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] requestId: abc123 userId: user456 - User logged in$/);
  });
});