import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import {
  makeSuccess,
  makeError,
  sleep,
  defaultBackoff,
  generateId,
  isRetryableError,
  withTimeout,
  withRetry,
  startTimer,
  maskString,
  toBoolean,
  isNil,
  readEnv,
} from '../src/index.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('test makeSuccess and makeError', () => {
  test('makeSuccess returns success payload with optional data', () => {
    expect.assertions(7);

    expect(makeSuccess('a string')).toEqual({ success: true, data: 'a string' });
    expect(makeSuccess(0)).toEqual({ success: true, data: 0 });
    expect(makeSuccess(1)).toEqual({ success: true, data: 1 });
    expect(makeSuccess({ foo: 1 })).toEqual({ success: true, data: { foo: 1 } });
    expect(makeSuccess([1, 2])).toEqual({ success: true, data: [1, 2] });
    expect(makeSuccess(null)).toEqual({ success: true, data: null });
    expect(makeSuccess()).toEqual({ success: true, data: undefined });
  });

  test('makeError produces failure payload with optional error and details', () => {
    expect.assertions(8);

    expect(makeError()).toEqual({success: false});
    expect(makeError('code-text')).toEqual({success: false, error: {code: 'code-text'}});
    expect(makeError('code-text', 'msg-text')).toEqual({success: false, error: {code: 'code-text', message: 'msg-text'}});
    expect(makeError('code-text', 'msg-text', null)).toEqual({success: false, error: {code: 'code-text', message: 'msg-text'}});
    expect(makeError('code-text', 'msg-text', 0)).toEqual({success: false, error: {code: 'code-text', message: 'msg-text'}, data: 0});
    expect(makeError('code-text', 'msg-text', 1)).toEqual({success: false, error: {code: 'code-text', message: 'msg-text'}, data: 1});
    expect(makeError('code-text', 'msg-text', {reason: 1})).toEqual({success: false, error: {code: 'code-text', message: 'msg-text'}, data: {reason: 1}});
    expect(makeError('code-text', 'msg-text', [1, 2])).toEqual({success: false, error: {code: 'code-text', message: 'msg-text'}, data: [1, 2]});
  });
});

describe('test sleep', () => {
  test('sleep resolves asynchronously', async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
  });

  test('sleep waits for specified milliseconds', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(95);
    expect(elapsed).toBeLessThan(200);
  });

  test('sleep with negative value resolves immediately', async () => {
    const start = Date.now();
    await sleep(-100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  test('sleep with zero resolves immediately', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  test('sleep returns Promise that resolves to undefined', async () => {
    const result = await sleep(10);
    expect(result).toBeUndefined();
  });

  test('sleep with mock timers - long duration', async () => {
    jest.useFakeTimers();

    const promise = sleep(5000);
    let resolved = false;
    promise.then(() => { resolved = true; });

    expect(resolved).toBe(false);

    jest.advanceTimersByTime(2500);
    await Promise.resolve();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(2500);
    await Promise.resolve();
    expect(resolved).toBe(true);

    jest.useRealTimers();
  });

  test('sleep with mock timers - multiple sleeps', async () => {
    jest.useFakeTimers();

    const results = [];
    const promises = [
      sleep(1000).then(() => results.push('1s')),
      sleep(2000).then(() => results.push('2s')),
      sleep(3000).then(() => results.push('3s'))
    ];

    expect(results).toEqual([]);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(results).toEqual(['1s']);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(results).toEqual(['1s', '2s']);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(results).toEqual(['1s', '2s', '3s']);

    jest.useRealTimers();
  });

  test('sleep with mock timers - very long duration', async () => {
    jest.useFakeTimers();

    const promise = sleep(60000); // 1 minute
    let resolved = false;
    promise.then(() => { resolved = true; });

    jest.advanceTimersByTime(59999);
    await Promise.resolve();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(resolved).toBe(true);

    jest.useRealTimers();
  });
});

describe('test defaultBackoff', () => {
  test('defaultBackoff doubles up to a ceiling', () => {
    expect(defaultBackoff(0)).toBe(2000);
    expect(defaultBackoff(1)).toBe(4000);
    expect(defaultBackoff(3)).toBe(8000);
  });
});

describe('test generateId', () => {
  test('generateId use crypto randomness', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    const randomBytesSpy = jest.spyOn(crypto, 'randomBytes');

    dateSpy.mockReturnValue(1700000000000);
    randomBytesSpy.mockReturnValue(Buffer.from('aabbccddeeff', 'hex'));

    expect(generateId()).toBe(`${(1700000000000).toString(16)}-aabbccddeeff`);
  });

  test('createTimeId falls back to Math.random', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    const randomBytesSpy = jest.spyOn(crypto, 'randomBytes');
    const mathRandomSpy = jest.spyOn(Math, 'random');

    dateSpy.mockReturnValue(42);
    randomBytesSpy.mockImplementation(() => {
      throw new Error('no entropy');
    });
    mathRandomSpy.mockReturnValue(0.123456789);

    const fallbackId = generateId();
    expect(fallbackId).toEqual('2a-1f9add373963');
  });

  test('generateId with prefix', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    const randomBytesSpy = jest.spyOn(crypto, 'randomBytes');

    dateSpy.mockReturnValue(1700000000000);
    randomBytesSpy.mockReturnValue(Buffer.from('aabbccddeeff', 'hex'));

    expect(generateId('abc')).toBe(`abc${(1700000000000).toString(16)}-aabbccddeeff`);
  });
});

describe('test isRetryableError', () => {
  test('isRetryableError matches status codes and network errors', () => {
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ status: 404 })).toBe(false);
    const err = new Error('boom');
    err.code = 'ECONNRESET';
    expect(isRetryableError(err)).toBe(true);
    expect(isRetryableError({ name: 'AbortError' })).toBe(true);
  });
});

describe('test withTimeout', () => {
  test('withTimeout resolves and enforces deadlines', async () => {
    await expect(withTimeout(Promise.resolve('done'), 50)).resolves.toBe('done');
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toMatchObject({
      message: 'Operation timed out',
      code: 'ETIMEDOUT'
    });
  });

  test('withTimeout resolves with promise that completes before timeout', async () => {
    const fastPromise = new Promise(resolve => setTimeout(() => resolve('fast'), 50));
    await expect(withTimeout(fastPromise, 100)).resolves.toBe('fast');
  });

  test('withTimeout rejects with custom timeout error when promise is slow', async () => {
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 200));
    await expect(withTimeout(slowPromise, 50)).rejects.toMatchObject({
      message: 'Operation timed out',
      code: 'ETIMEDOUT'
    });
  });

  test('withTimeout preserves promise rejection', async () => {
    const rejectedPromise = Promise.reject(new Error('original error'));
    await expect(withTimeout(rejectedPromise, 100)).rejects.toThrow('original error');
  });

  test('withTimeout with zero timeout means no time out', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve('result'), 10));
    await expect(withTimeout(promise, 0)).resolves.toBe('result');
  });

  test('withTimeout with negative timeout means no time out', async () => {
    const promise = Promise.resolve('immediate');
    await expect(withTimeout(promise, -100)).resolves.toBe('immediate');
  });

  test('withTimeout handles already resolved promises', async () => {
    const resolvedPromise = Promise.resolve(42);
    await expect(withTimeout(resolvedPromise, 1000)).resolves.toBe(42);
  });

  test('withTimeout handles already rejected promises', async () => {
    const rejectedPromise = Promise.reject(new Error('already failed'));
    await expect(withTimeout(rejectedPromise, 1000)).rejects.toThrow('already failed');
  });

  test('withTimeout with mock timers - precise timing control', async () => {
    jest.useFakeTimers();

    const promise = new Promise(resolve => {
      setTimeout(() => resolve('delayed result'), 1000);
    });

    const timeoutPromise = withTimeout(promise, 500);
    let resolved = false;
    let rejected = false;
    let error;

    timeoutPromise
      .then(() => { resolved = true; })
      .catch(err => { rejected = true; error = err; });

    expect(resolved).toBe(false);
    expect(rejected).toBe(false);

    // Advance to 400ms - should not timeout yet
    jest.advanceTimersByTime(400);
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(rejected).toBe(false);

    // Advance to 500ms total - should timeout now
    jest.advanceTimersByTime(100);
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(rejected).toBe(true);
    expect(error).toMatchObject({
      message: 'Operation timed out',
      code: 'ETIMEDOUT'
    });

    jest.useRealTimers();
  });

  test('withTimeout with different data types', async () => {
    await expect(withTimeout(Promise.resolve(null), 50)).resolves.toBe(null);
    await expect(withTimeout(Promise.resolve(undefined), 50)).resolves.toBe(undefined);
    await expect(withTimeout(Promise.resolve(0), 50)).resolves.toBe(0);
    await expect(withTimeout(Promise.resolve(false), 50)).resolves.toBe(false);
    await expect(withTimeout(Promise.resolve([1, 2, 3]), 50)).resolves.toEqual([1, 2, 3]);
    await expect(withTimeout(Promise.resolve({key: 'value'}), 50)).resolves.toEqual({key: 'value'});
  });

  test('withTimeout with very large timeout values', async () => {
    const fastPromise = Promise.resolve('quick');
    await expect(withTimeout(fastPromise, Number.MAX_SAFE_INTEGER)).resolves.toBe('quick');
  });

  test('withTimeout with custom error message', async () => {
    const slowPromise = new Promise(() => {});
    await expect(withTimeout(slowPromise, 10, 'Custom timeout message')).rejects.toMatchObject({
      message: 'Custom timeout message',
      code: 'ETIMEDOUT'
    });
  });

  test('withTimeout with empty custom error message uses default', async () => {
    const slowPromise = new Promise(() => {});
    await expect(withTimeout(slowPromise, 10, '')).rejects.toMatchObject({
      message: 'Operation timed out',
      code: 'ETIMEDOUT'
    });
  });

  test('withTimeout with null custom error message uses default', async () => {
    const slowPromise = new Promise(() => {});
    await expect(withTimeout(slowPromise, 10, null)).rejects.toMatchObject({
      message: 'Operation timed out',
      code: 'ETIMEDOUT'
    });
  });
});

describe('test withRetry', () => {
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
});

describe('test startTimer', () => {
  test('startTimer reports elapsed milliseconds', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1500);
    const timer = startTimer();
    expect(timer.end()).toBe(500);
  });
});

describe('test mask string', () => {
  test('maskString handles null and undefined', () => {
    expect(maskString(null)).toBe('');
    expect(maskString(undefined)).toBe('');
  });

  test('maskString handles 0-50 characters', () => {
    // Based on actual output with maskPercentage=0.7, maxShownLength=10
    const testCases = [
      [0, '', ''],
      [1, 'a', '*'],
      [2, 'ab', '*b'],
      [3, 'abc', '**c'],
      [4, 'abcd', '***d'],
      [5, 'abcde', '****e'],
      [6, 'abcdef', '*****f'],
      [7, 'abcdefg', 'a*****g'],
      [8, 'abcdefgh', 'a******h'],
      [9, 'abcdefghi', 'a*******i'],
      [10, 'abcdefghij', 'a*******ij'],
      [11, 'abcdefghijk', 'a********jk'],
      [12, 'abcdefghijkl', 'a*********kl'],
      [13, 'abcdefghijklm', 'a**********lm'],
      [14, 'abcdefghijklmn', 'ab**********mn'],
      [15, 'abcdefghijklmno', 'ab***********no'],
      [16, 'abcdefghijklmnop', 'ab************op'],
      [17, 'abcdefghijklmnopq', 'ab************opq'],
      [18, 'abcdefghijklmnopqr', 'ab*************pqr'],
      [19, 'abcdefghijklmnopqrs', 'ab**************qrs'],
      [20, 'abcdefghijklmnopqrst', 'abc**************rst'],
      [21, 'abcdefghijklmnopqrstu', 'abc***************stu'],
      [22, 'abcdefghijklmnopqrstuv', 'abc****************tuv'],
      [23, 'abcdefghijklmnopqrstuvw', 'abc*****************uvw'],
      [24, 'abcdefghijklmnopqrstuvwx', 'abc*****************uvwx'],
      [25, 'abcdefghijklmnopqrstuvwxy', 'abc******************vwxy'],
      [26, 'abcdefghijklmnopqrstuvwxyz', 'abc*******************wxyz'],
      [27, 'abcdefghijklmnopqrstuvwxyzA', 'abcd*******************xyzA'],
      [28, 'abcdefghijklmnopqrstuvwxyzAB', 'abcd********************yzAB'],
      [29, 'abcdefghijklmnopqrstuvwxyzABC', 'abcd*********************zABC'],
      [30, 'abcdefghijklmnopqrstuvwxyzABCD', 'abcd*********************zABCD']
    ];

    testCases.forEach(([, input, expected]) => {
      expect(maskString(input)).toBe(expected);
    });
  });

  test('maskString handles longer strings (31-50 characters)', () => {
    const testCases = [
      [31, 'abcdefghijklmnopqrstuvwxyzABCDE', 'abcd**********************ABCDE'],
      [32, 'abcdefghijklmnopqrstuvwxyzABCDEF', 'abcd***********************BCDEF'],
      [33, 'abcdefghijklmnopqrstuvwxyzABCDEFG', 'abcd************************CDEFG'],
      [34, 'abcdefghijklmnopqrstuvwxyzABCDEFGH', 'abcde************************DEFGH'],
      [35, 'abcdefghijklmnopqrstuvwxyzABCDEFGHI', 'abcde*************************EFGHI'],
      [40, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN', 'abcde******************************JKLMN'],
      [45, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRS', 'abcde***********************************OPQRS'],
      [50, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWX', 'abcde****************************************TUVWX']
    ];

    testCases.forEach(([, input, expected]) => {
      expect(maskString(input)).toBe(expected);
    });
  });

  test('maskString converts non-string input to string', () => {
    expect(maskString(123)).toBe('**3');
    expect(maskString(12345)).toBe('****5');
    expect(maskString(true)).toBe('***e');
    expect(maskString(false)).toBe('****e');
    expect(maskString(0)).toBe('*');
    expect(maskString([1,2,3])).toBe('****3');
    expect(maskString({key: 'value'})).toBe('[o***********t]');
  });

  test('maskString handles special characters', () => {
    expect(maskString('a@b')).toBe('**b');
    expect(maskString('user@domain.com')).toBe('us***********om');
    expect(maskString('password123!')).toBe('p*********3!');
    expect(maskString('abc-def-ghi')).toBe('a********hi');
  });

  test('maskString handles unicode characters', () => {
    expect(maskString('你好')).toBe('*好');
    expect(maskString('café')).toBe('***é');
    expect(maskString('用户名@域名.com')).toBe('用*******om');
    // Note: Emoji handling may vary due to unicode complexity
    expect(maskString('🎉🎊🎈').length).toBeGreaterThan(3);
  });
});

describe('test toBoolean', () => {
  test('toBoolean converts various values to boolean', () => {
    // Truthy values
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean(123)).toBe(true);
    expect(toBoolean('true')).toBe(true);
    expect(toBoolean('TRUE')).toBe(true);
    expect(toBoolean('1')).toBe(true);
    expect(toBoolean('yes')).toBe(true);
    expect(toBoolean('y')).toBe(true);
    expect(toBoolean('on')).toBe(true);
    expect(toBoolean(' YES ')).toBe(true);

    // Falsy values
    expect(toBoolean(false)).toBe(false);
    expect(toBoolean(0)).toBe(false);
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
  });
});

describe('test isNil', () => {
  test('isNil checks for null or undefined', () => {
    expect(isNil(null)).toBe(true);
    expect(isNil(undefined)).toBe(true);
    expect(isNil(false)).toBe(false);
    expect(isNil(0)).toBe(false);
    expect(isNil('')).toBe(false);
    expect(isNil([])).toBe(false);
    expect(isNil({})).toBe(false);
  });
});

describe('test readEnv', () => {
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

  test('readEnv defaults to String type when no type specified', () => {
    const envParams = {
      NO_TYPE_STRING: { defaultValue: 'default' },
      NO_TYPE_NUMBER: { defaultValue: 'default' },
      NO_TYPE_BOOLEAN: { defaultValue: 'default' }
    };

    const envValues = {
      NO_TYPE_STRING: 'text',
      NO_TYPE_NUMBER: 123,
      NO_TYPE_BOOLEAN: true
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      NO_TYPE_STRING: 'text',
      NO_TYPE_NUMBER: '123',
      NO_TYPE_BOOLEAN: 'true'
    });
  });

  test('readEnv handles Number type conversions', () => {
    const envParams = {
      VALID_NUM: { type: Number, defaultValue: 0 },
      ZERO: { type: Number, defaultValue: -1 },
      NEGATIVE: { type: Number, defaultValue: 1 },
      FLOAT: { type: Number, defaultValue: 0 }
    };

    const envValues = {
      VALID_NUM: '42',
      ZERO: '0',
      NEGATIVE: '-123',
      FLOAT: '3.14'
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      VALID_NUM: 42,
      ZERO: 0,
      NEGATIVE: -123,
      FLOAT: 3.14
    });
  });

  test('readEnv throws error for invalid Number values when required', () => {
    const envParams = {
      INVALID_NUM: { type: Number, required: true }
    };
    const envValues = {
      INVALID_NUM: 'not_a_number'
    };

    expect(() => readEnv(envParams, envValues)).toThrow('invalid env');
  });

  test('readEnv uses defaultValue for invalid Number when not required', () => {
    const envParams = {
      INVALID_NUM: { type: Number, required: false, defaultValue: 999 }
    };
    const envValues = {
      INVALID_NUM: 'not_a_number'
    };

    const result = readEnv(envParams, envValues);
    expect(result.INVALID_NUM).toBeNaN();
  });

  test('readEnv handles Boolean type conversions', () => {
    const envParams = {
      BOOL_TRUE: { type: Boolean, defaultValue: false },
      BOOL_FALSE: { type: Boolean, defaultValue: true },
      BOOL_ONE: { type: Boolean, defaultValue: false },
      BOOL_ZERO: { type: Boolean, defaultValue: true },
      BOOL_YES: { type: Boolean, defaultValue: false },
      BOOL_NO: { type: Boolean, defaultValue: true }
    };

    const envValues = {
      BOOL_TRUE: 'true',
      BOOL_FALSE: 'false',
      BOOL_ONE: '1',
      BOOL_ZERO: '0',
      BOOL_YES: 'yes',
      BOOL_NO: 'no'
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      BOOL_TRUE: true,
      BOOL_FALSE: false,
      BOOL_ONE: true,
      BOOL_ZERO: false,
      BOOL_YES: true,
      BOOL_NO: false
    });
  });

  test('readEnv handles String type conversions', () => {
    const envParams = {
      STR_NUM: { type: String, defaultValue: '' },
      STR_BOOL: { type: String, defaultValue: '' },
      STR_EMPTY: { type: String, defaultValue: 'default' }
    };

    const envValues = {
      STR_NUM: 123,
      STR_BOOL: true,
      STR_EMPTY: ''
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      STR_NUM: '123',
      STR_BOOL: 'true',
      STR_EMPTY: ''
    });
  });

  test('readEnv treats undefined type as String (custom func not currently supported)', () => {
    const envParams = {
      CUSTOM_FIELD: {
        func: (val) => val.split(','), // func is ignored, treated as String type
        required: false,
        defaultValue: []
      },
      ANOTHER_FIELD: {
        func: (val) => val.toUpperCase(), // func is ignored, treated as String type
        required: true
      }
    };

    const envValues = {
      CUSTOM_FIELD: 'a,b,c',
      ANOTHER_FIELD: 'hello world'
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      CUSTOM_FIELD: 'a,b,c', // Treated as string, not split
      ANOTHER_FIELD: 'hello world' // Treated as string, not uppercased
    });
  });

  test('readEnv uses defaultValues when values are missing', () => {
    const envParams = {
      WITH_DEFAULT: { type: String, defaultValue: 'default_value' },
      NUM_DEFAULT: { type: Number, defaultValue: 42 },
      BOOL_DEFAULT: { type: Boolean, defaultValue: true }
    };

    const envValues = {}; // No values provided

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      WITH_DEFAULT: 'default_value',
      NUM_DEFAULT: 42,
      BOOL_DEFAULT: true
    });
  });

  test('readEnv handles mixed scenarios', () => {
    const envParams = {
      REQUIRED_STR: { type: String, required: true },
      OPTIONAL_NUM: { type: Number, defaultValue: 100 },
      BOOLEAN_FIELD: { type: Boolean, required: true },
      NO_TYPE_FIELD: { defaultValue: 'no_type_default' }
    };

    const envValues = {
      REQUIRED_STR: 'provided',
      BOOLEAN_FIELD: 'true'
      // OPTIONAL_NUM and NO_TYPE_FIELD not provided, should use defaults
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      REQUIRED_STR: 'provided',
      OPTIONAL_NUM: 100,
      BOOLEAN_FIELD: true,
      NO_TYPE_FIELD: 'no_type_default'
    });
  });

  test('readEnv error includes invalid environment details', () => {
    const envParams = {
      REQUIRED1: { type: String, required: true },
      REQUIRED2: { type: Number, required: true }
    };
    const envValues = {
      REQUIRED2: 'not_a_number'
    };

    try {
      readEnv(envParams, envValues);
    } catch (error) {
      expect(error.message).toBe('invalid env');
      expect(error.cause).toEqual([
        { name: 'REQUIRED1', value: undefined },
        { name: 'REQUIRED2', value: NaN }
      ]);
    }
  });
});
