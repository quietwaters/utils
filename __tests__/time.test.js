import { jest } from '@jest/globals';
import {
  sleep,
  startTimer,
} from '../src/time';

afterEach(() => {
  jest.restoreAllMocks();
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

describe('test startTimer', () => {
  test('startTimer reports elapsed milliseconds', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1500);
    const timer = startTimer();
    expect(timer.end()).toBe(500);
  });
});
