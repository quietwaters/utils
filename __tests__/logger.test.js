import { jest } from '@jest/globals';
import { nowISOString, logWithTime, createTimedLogger, logger } from '../src/logger.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('nowISOString', () => {
  test('returns ISO string for current date', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const result = nowISOString();
    expect(result).toBe('2023-05-15T14:30:25.123Z');
  });

  test('returns valid ISO format', () => {
    const result = nowISOString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('logWithTime', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  test('logs message with timestamp using specified log level', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    logWithTime('info', 'Test message');

    expect(consoleSpy.info).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Test message');
  });

  test('falls back to console.log for invalid log level', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    logWithTime('invalid', 'Test message');

    expect(consoleSpy.log).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Test message');
  });

  test('logs message with payload when provided', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    const payload = { key: 'value', number: 42 };

    logWithTime('warn', 'Warning message', payload);

    expect(consoleSpy.warn).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Warning message', payload);
  });

  test('handles undefined payload correctly', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    logWithTime('error', 'Error message', undefined);

    expect(consoleSpy.error).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Error message');
  });

  test('handles null payload as defined value', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    logWithTime('debug', 'Debug message', null);

    expect(consoleSpy.debug).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Debug message', null);
  });

  test('uses non-string level parameter correctly', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    logWithTime(123, 'Test message');

    expect(consoleSpy.log).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Test message');
  });
});

describe('createTimedLogger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  test('creates logger with default levels', () => {
    const timedLogger = createTimedLogger();

    expect(timedLogger).toHaveProperty('info');
    expect(timedLogger).toHaveProperty('warn');
    expect(timedLogger).toHaveProperty('error');
    expect(timedLogger).toHaveProperty('debug');
    expect(typeof timedLogger.info).toBe('function');
  });

  test('creates logger with custom levels', () => {
    const customLogger = createTimedLogger(['trace', 'fatal']);

    expect(customLogger).toHaveProperty('trace');
    expect(customLogger).toHaveProperty('fatal');
    expect(customLogger).not.toHaveProperty('info');
    expect(typeof customLogger.trace).toBe('function');
  });

  test('created logger methods work correctly', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const timedLogger = createTimedLogger(['custom']);
    timedLogger.custom('Custom message', { data: 'test' });

    expect(consoleSpy.log).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Custom message', { data: 'test' });
  });

  test('handles empty levels array', () => {
    const emptyLogger = createTimedLogger([]);

    expect(Object.keys(emptyLogger)).toHaveLength(0);
  });
});

describe('logger (default export)', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  test('has all expected log level methods', () => {
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('debug');
  });

  test('logger methods work correctly', () => {
    const mockDate = new Date('2023-05-15T14:30:25.123Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    logger.debug('Debug message');

    expect(consoleSpy.info).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Info message');
    expect(consoleSpy.warn).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Warning message');
    expect(consoleSpy.error).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Error message');
    expect(consoleSpy.debug).toHaveBeenCalledWith('[2023-05-15T14:30:25.123Z] Debug message');
  });
});