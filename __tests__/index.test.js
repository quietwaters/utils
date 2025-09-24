import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import {
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
  formatTime
} from '../src/index.js';

afterEach(() => {
  jest.restoreAllMocks();
});

test('makeSuccess returns success payload with data', () => {
  expect(makeSuccess({ foo: 1 })).toEqual({ success: true, data: { foo: 1 } });
});

test('makeSuccess can include an error field when requested', () => {
  expect(makeSuccess(null, { includeErrorField: true })).toEqual({ success: true, data: null, error: null });
});

test('makeError produces failure payload with error details', () => {
  expect(makeError('E_TEST', 'failed', { attempt: 1 })).toEqual({
    success: false,
    error: { code: 'E_TEST', message: 'failed' },
    data: { attempt: 1 }
  });
});






test('generateRequestId trims prefixes and includes timestamp and random parts', () => {
  const id = generateRequestId(' custom ');
  expect(id).toMatch(/^custom_[0-9a-f]+_[0-9a-f]+$/);
  const defaultId = generateRequestId();
  expect(defaultId.startsWith('req_')).toBe(true);
});

test('createTimeId prefers crypto randomness and falls back to Math.random', () => {
  const dateSpy = jest.spyOn(Date, 'now');
  const randomBytesSpy = jest.spyOn(crypto, 'randomBytes');
  const mathRandomSpy = jest.spyOn(Math, 'random');

  dateSpy.mockReturnValue(1700000000000);
  randomBytesSpy.mockReturnValue(Buffer.from('aabbccddeeff', 'hex'));
  mathRandomSpy.mockReturnValue(0.5);

  expect(createTimeId()).toBe(`${(1700000000000).toString(16)}-aabbccddeeff`);

  dateSpy.mockReturnValue(42);
  randomBytesSpy.mockImplementation(() => {
    throw new Error('no entropy');
  });
  mathRandomSpy.mockReturnValue(0.123456789);

  const fallbackId = createTimeId();
  expect(fallbackId.startsWith(`${(42).toString(16)}-`)).toBe(true);
  const randomPart = fallbackId.split('-')[1];
  expect(randomPart.length).toBeGreaterThan(0);
});

test('sleep resolves asynchronously', async () => {
  await expect(sleep(0)).resolves.toBeUndefined();
});

test('defaultBackoff doubles up to a ceiling', () => {
  expect(defaultBackoff(0)).toBe(2000);
  expect(defaultBackoff(1)).toBe(4000);
  expect(defaultBackoff(3)).toBe(8000);
});

test('isRetryableError matches status codes and network errors', () => {
  expect(isRetryableError({ status: 500 })).toBe(true);
  expect(isRetryableError({ status: 429 })).toBe(true);
  expect(isRetryableError({ status: 404 })).toBe(false);
  const err = new Error('boom');
  err.code = 'ECONNRESET';
  expect(isRetryableError(err)).toBe(true);
  expect(isRetryableError({ name: 'AbortError' })).toBe(true);
});

test('withTimeout resolves and enforces deadlines', async () => {
  await expect(withTimeout(Promise.resolve('done'), 50)).resolves.toBe('done');
  await expect(withTimeout(new Promise(() => {}), 10)).rejects.toMatchObject({
    message: 'Operation timed out',
    code: 'ETIMEDOUT'
  });
});

test('withRetry retries retryable errors and stops on success', async () => {
  let attempts = 0;
  await expect(withRetry(async () => {
    if (attempts < 2) {
      attempts += 1;
      const err = new Error('temporary');
      err.code = 'ETIMEDOUT';
      throw err;
    }
    return 'ok';
  }, { maxRetries: 3, backoff: () => 0 })).resolves.toBe('ok');
  expect(attempts).toBe(2);
});

test('withRetry throws last error when not retryable', async () => {
  let attempts = 0;
  await expect(withRetry(async () => {
    attempts += 1;
    throw new Error('permanent');
  }, { maxRetries: 2, isRetryable: () => false })).rejects.toThrow('permanent');
  expect(attempts).toBe(1);
});

test('startTimer reports elapsed milliseconds', () => {
  const dateSpy = jest.spyOn(Date, 'now');
  dateSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1500);
  const timer = startTimer();
  expect(timer.end()).toBe(500);
});

test('maskString masks 80% of string length with max 4 chars at head/tail', () => {
  // Short strings
  expect(maskString('ab')).toBe('**');
  expect(maskString('abc')).toBe('***'); // 80% of 3 = 3, so all masked

  // Medium strings
  expect(maskString('12345678')).toBe('1*******'); // 8 chars: 80% = 7 masked, 1 kept
  expect(maskString('1234567890')).toBe('1********0'); // 10 chars: 80% = 8 masked, 1+1 kept

  // Long strings (max 4 head + 4 tail)
  expect(maskString('abcdefghijklmnopqr')).toBe('ab***************r'); // 18 chars: 80% = 15 masked, 2+1 kept
  expect(maskString('abcdefghijklmnopqrstuvwxyz')).toBe('abc*********************yz'); // 26 chars: 80% = 21 masked, 3+2 kept

  // Edge cases
  expect(maskString('')).toBe('');
  expect(maskString(123)).toBe('');
  expect(maskString('x')).toBe('*');

  // Reveal option
  expect(maskString('secret', { reveal: true })).toBe('secret');
  expect(maskString('secret', { reveal: false })).toBe('s*****'); // 6 chars: 80% = 5 masked, 1 kept
});

test('toBoolean converts various values to boolean', () => {
  // Truthy values
  expect(toBoolean(true)).toBe(true);
  expect(toBoolean('true')).toBe(true);
  expect(toBoolean('TRUE')).toBe(true);
  expect(toBoolean('1')).toBe(true);
  expect(toBoolean('yes')).toBe(true);
  expect(toBoolean('y')).toBe(true);
  expect(toBoolean('on')).toBe(true);
  expect(toBoolean(' YES ')).toBe(true);

  // Falsy values
  expect(toBoolean(false)).toBe(false);
  expect(toBoolean('false')).toBe(false);
  expect(toBoolean('FALSE')).toBe(false);
  expect(toBoolean('0')).toBe(false);
  expect(toBoolean('no')).toBe(false);
  expect(toBoolean('n')).toBe(false);
  expect(toBoolean('off')).toBe(false);
  expect(toBoolean(' NO ')).toBe(false);

  // Edge cases
  expect(toBoolean(undefined)).toBe(false);
  expect(toBoolean(null)).toBe(false);
  expect(toBoolean('')).toBe(false);
  expect(toBoolean('   ')).toBe(false);
  expect(toBoolean('invalid')).toBe(false);
  expect(toBoolean(123)).toBe(false);
});

test('isNil checks for null or undefined', () => {
  expect(isNil(null)).toBe(true);
  expect(isNil(undefined)).toBe(true);
  expect(isNil(false)).toBe(false);
  expect(isNil(0)).toBe(false);
  expect(isNil('')).toBe(false);
  expect(isNil([])).toBe(false);
  expect(isNil({})).toBe(false);
});

test('readEnv parses environment variables with validation', () => {
  const envParams = {
    PORT: { type: Number, required: true },
    DEBUG: { type: Boolean, defaultValue: false },
    API_KEY: { type: String, required: true },
    OPTIONAL: { type: String, defaultValue: 'default' }
  };

  const envValues = {
    PORT: '3000',
    DEBUG: 'true',
    API_KEY: 'secret123'
  };

  const result = readEnv(envParams, envValues);
  expect(result).toEqual({
    PORT: 3000,
    DEBUG: true,
    API_KEY: 'secret123',
    OPTIONAL: 'default'
  });
});

test('readEnv throws error for missing required values', () => {
  const envParams = {
    REQUIRED_VAR: { type: String, required: true }
  };
  const envValues = {};

  expect(() => readEnv(envParams, envValues)).toThrow('invalid env');
});

test('readEnv handles custom function types', () => {
  const envParams = {
    CUSTOM: {
      func: (val) => val.split(','),
      required: false,
      defaultValue: []
    }
  };
  const envValues = {
    CUSTOM: 'a,b,c'
  };

  const result = readEnv(envParams, envValues);
  expect(result.CUSTOM).toEqual(['a', 'b', 'c']);
});

test('formatTime formats dates with various options', () => {
  const testDate = new Date('2023-05-15T14:30:25.123Z');

  // UTC formatting
  expect(formatTime(testDate)).toBe('2023-05-15 14:30');
  expect(formatTime(testDate, { includeTime: false })).toBe('2023-05-15');
  expect(formatTime(testDate, { includeTime: true, timezone: 'UTC' })).toBe('2023-05-15 14:30');

  // Test with timestamp
  expect(formatTime(testDate.getTime())).toBe('2023-05-15 14:30');

  // Test timezone (using a common timezone)
  expect(formatTime(testDate, { timezone: 'America/New_York' })).toMatch(/^2023-05-15 \d{2}:\d{2}$/);

  // Invalid date
  expect(formatTime('invalid')).toBe('');
  expect(formatTime(new Date('invalid'))).toBe('');
});


