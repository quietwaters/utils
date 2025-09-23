import { jest } from '@jest/globals';
import { formatTime } from '../src/date.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('formatTime', () => {
  test('formats date with time by default', () => {
    const date = new Date('2023-05-15T14:30:25.000Z');
    const result = formatTime(date);
    expect(result).toBe('2023-05-15 14:30');
  });

  test('formats date without time when includeTime is false', () => {
    const date = new Date('2023-05-15T14:30:25.000Z');
    const result = formatTime(date, { includeTime: false });
    expect(result).toBe('2023-05-15');
  });

  test('formats timestamp number input', () => {
    const timestamp = new Date('2023-12-01T09:15:00.000Z').getTime();
    const result = formatTime(timestamp);
    expect(result).toBe('2023-12-01 09:15');
  });

  test('formats ISO string input', () => {
    const isoString = '2023-07-20T16:45:30.000Z';
    const result = formatTime(isoString);
    expect(result).toBe('2023-07-20 16:45');
  });

  test('returns empty string for invalid date input', () => {
    expect(formatTime('invalid-date')).toBe('');
    expect(formatTime(NaN)).toBe('');
    expect(formatTime(null)).toBe('1970-01-01 00:00'); // null converts to 0, which is a valid timestamp
    expect(formatTime(undefined)).toBe('');
  });

  test('pads single digit months and days with zero', () => {
    const date = new Date('2023-01-05T08:09:00.000Z');
    const result = formatTime(date);
    expect(result).toBe('2023-01-05 08:09');
  });

  test('handles leap year February correctly', () => {
    const date = new Date('2024-02-29T12:00:00.000Z');
    const result = formatTime(date, { includeTime: false });
    expect(result).toBe('2024-02-29');
  });

  test('handles year boundaries correctly', () => {
    const newYear = new Date('2024-01-01T00:00:00.000Z');
    const endYear = new Date('2023-12-31T23:59:59.000Z');

    expect(formatTime(newYear)).toBe('2024-01-01 00:00');
    expect(formatTime(endYear)).toBe('2023-12-31 23:59');
  });

  test('formats date with different timezones', () => {
    const date = new Date('2023-05-15T14:30:25.000Z');

    // UTC (default)
    expect(formatTime(date)).toBe('2023-05-15 14:30');
    expect(formatTime(date, { timezone: 'UTC' })).toBe('2023-05-15 14:30');

    // Different timezones
    expect(formatTime(date, { timezone: 'America/New_York' })).toBe('2023-05-15 10:30');
    expect(formatTime(date, { timezone: 'Asia/Shanghai' })).toBe('2023-05-15 22:30');
    expect(formatTime(date, { timezone: 'Europe/London' })).toBe('2023-05-15 15:30');
  });

  test('formats date without time in different timezones', () => {
    const date = new Date('2023-05-15T14:30:25.000Z');

    expect(formatTime(date, { includeTime: false, timezone: 'UTC' })).toBe('2023-05-15');
    expect(formatTime(date, { includeTime: false, timezone: 'America/New_York' })).toBe('2023-05-15');
    expect(formatTime(date, { includeTime: false, timezone: 'Asia/Shanghai' })).toBe('2023-05-15');
  });

  test('handles timezone date boundary correctly', () => {
    // This UTC time is late in the day, which may cross to next day in some timezones
    const date = new Date('2023-05-15T23:30:00.000Z');

    expect(formatTime(date, { timezone: 'UTC' })).toBe('2023-05-15 23:30');
    expect(formatTime(date, { timezone: 'Asia/Tokyo' })).toBe('2023-05-16 08:30');
    expect(formatTime(date, { timezone: 'America/Los_Angeles' })).toBe('2023-05-15 16:30');
  });
});