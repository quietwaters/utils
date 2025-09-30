const {
  defaultBackoff,
  isRetryableError,
  withTimeout,
  withRetry,
} = require('../src/flowcontrol');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('test defaultBackoff', () => {
  test('defaultBackoff doubles up to a ceiling', () => {
    expect(defaultBackoff(0)).toBe(2000);
    expect(defaultBackoff(1)).toBe(4000);
    expect(defaultBackoff(3)).toBe(8000);
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
    // Test with Number.MAX_SAFE_INTEGER - should be clamped internally
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
