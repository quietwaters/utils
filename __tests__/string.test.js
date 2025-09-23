import { jest } from '@jest/globals';
import {
  normalizeString,
  safeString,
  parseBoolean,
  toNumber,
  toInt,
  compactWhitespace,
  createPreview
} from '../src/string.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('normalizeString', () => {
  test('returns trimmed string for valid input', () => {
    expect(normalizeString('  hello world  ')).toBe('hello world');
    expect(normalizeString('test')).toBe('test');
  });

  test('returns fallback for null/undefined input', () => {
    expect(normalizeString(null)).toBe('');
    expect(normalizeString(undefined)).toBe('');
    expect(normalizeString(null, { fallback: 'default' })).toBe('default');
  });

  test('returns fallback for non-string input', () => {
    expect(normalizeString(123)).toBe('');
    expect(normalizeString({})).toBe('');
    expect(normalizeString([])).toBe('');
    expect(normalizeString(true)).toBe('');
  });

  test('returns fallback for empty string after trimming', () => {
    expect(normalizeString('')).toBe('');
    expect(normalizeString('   ')).toBe('');
    expect(normalizeString('  \n\t  ')).toBe('');
  });

  test('respects trim option', () => {
    expect(normalizeString('  hello  ', { trim: false })).toBe('  hello  ');
    expect(normalizeString('  hello  ', { trim: true })).toBe('hello');
  });

  test('enforces maxLength limit', () => {
    const longString = 'a'.repeat(100);
    expect(normalizeString(longString, { maxLength: 10 })).toBe('a'.repeat(10));
    expect(normalizeString('short', { maxLength: 10 })).toBe('short');
  });

  test('handles maxLength with trim', () => {
    expect(normalizeString('  hello world  ', { maxLength: 8, trim: true })).toBe('hello wo');
  });

  test('applies maxLength when set to positive values, ignores when falsy', () => {
    const longString = 'a'.repeat(100);
    expect(normalizeString(longString, { maxLength: 0 })).toBe(longString);
    expect(normalizeString(longString, { maxLength: 50 })).toBe('a'.repeat(50));
  });
});

describe('safeString', () => {
  test('returns input for string values', () => {
    expect(safeString('hello')).toBe('hello');
    expect(safeString('')).toBe('');
    expect(safeString('   spaces   ')).toBe('   spaces   ');
  });

  test('returns fallback for non-string values', () => {
    expect(safeString(123)).toBe('');
    expect(safeString(null)).toBe('');
    expect(safeString(undefined)).toBe('');
    expect(safeString({})).toBe('');
    expect(safeString([])).toBe('');
    expect(safeString(true)).toBe('');
  });

  test('uses custom fallback', () => {
    expect(safeString(123, 'default')).toBe('default');
    expect(safeString(null, 'N/A')).toBe('N/A');
  });
});

describe('parseBoolean', () => {
  test('returns input for boolean values', () => {
    expect(parseBoolean(true)).toBe(true);
    expect(parseBoolean(false)).toBe(false);
  });

  test('returns defaultValue for null/undefined', () => {
    expect(parseBoolean(null)).toBe(false);
    expect(parseBoolean(undefined)).toBe(false);
    expect(parseBoolean(null, true)).toBe(true);
  });

  test('parses truthy string values', () => {
    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('TRUE')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('yes')).toBe(true);
    expect(parseBoolean('YES')).toBe(true);
    expect(parseBoolean('y')).toBe(true);
    expect(parseBoolean('Y')).toBe(true);
    expect(parseBoolean('on')).toBe(true);
    expect(parseBoolean('ON')).toBe(true);
  });

  test('parses falsy string values', () => {
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('FALSE')).toBe(false);
    expect(parseBoolean('0')).toBe(false);
    expect(parseBoolean('no')).toBe(false);
    expect(parseBoolean('NO')).toBe(false);
    expect(parseBoolean('n')).toBe(false);
    expect(parseBoolean('N')).toBe(false);
    expect(parseBoolean('off')).toBe(false);
    expect(parseBoolean('OFF')).toBe(false);
  });

  test('handles whitespace in string values', () => {
    expect(parseBoolean('  true  ')).toBe(true);
    expect(parseBoolean('  false  ')).toBe(false);
    expect(parseBoolean('  1  ')).toBe(true);
  });

  test('returns defaultValue for unrecognized strings', () => {
    expect(parseBoolean('maybe')).toBe(false);
    expect(parseBoolean('invalid')).toBe(false);
    expect(parseBoolean('maybe', true)).toBe(true);
  });

  test('returns defaultValue for empty string', () => {
    expect(parseBoolean('')).toBe(false);
    expect(parseBoolean('   ')).toBe(false);
    expect(parseBoolean('', true)).toBe(true);
  });

  test('converts non-string values to string', () => {
    expect(parseBoolean(1)).toBe(true);
    expect(parseBoolean(0)).toBe(false);
    expect(parseBoolean({})).toBe(false);
  });
});

describe('toNumber', () => {
  test('converts valid numeric strings', () => {
    expect(toNumber('123')).toBe(123);
    expect(toNumber('123.45')).toBe(123.45);
    expect(toNumber('-456')).toBe(-456);
    expect(toNumber('0')).toBe(0);
  });

  test('converts numeric values', () => {
    expect(toNumber(123)).toBe(123);
    expect(toNumber(123.45)).toBe(123.45);
    expect(toNumber(-456)).toBe(-456);
  });

  test('returns fallback for invalid values', () => {
    expect(toNumber('abc')).toBe(undefined);
    expect(toNumber('')).toBe(0); // Empty string converts to 0
    expect(toNumber(null)).toBe(0); // null converts to 0
    expect(toNumber(undefined)).toBe(undefined);
    expect(toNumber({})).toBe(undefined);
    expect(toNumber('abc', 0)).toBe(0);
  });

  test('returns fallback for Infinity and NaN', () => {
    expect(toNumber(Infinity)).toBe(undefined);
    expect(toNumber(-Infinity)).toBe(undefined);
    expect(toNumber(NaN)).toBe(undefined);
    expect(toNumber(Infinity, 999)).toBe(999);
  });

  test('handles scientific notation', () => {
    expect(toNumber('1e3')).toBe(1000);
    expect(toNumber('1.5e2')).toBe(150);
  });
});

describe('toInt', () => {
  test('converts valid integer strings', () => {
    expect(toInt('123')).toBe(123);
    expect(toInt('-456')).toBe(-456);
    expect(toInt('0')).toBe(0);
  });

  test('converts integer values', () => {
    expect(toInt(123)).toBe(123);
    expect(toInt(-456)).toBe(-456);
    expect(toInt(0)).toBe(0);
  });

  test('returns fallback for non-integer values', () => {
    expect(toInt('123.45')).toBe(undefined);
    expect(toInt(123.45)).toBe(undefined);
    expect(toInt('abc')).toBe(undefined);
    expect(toInt('')).toBe(0); // Empty string converts to 0, which is an integer
    expect(toInt(123.45, 0)).toBe(0);
  });

  test('returns fallback for Infinity and NaN', () => {
    expect(toInt(Infinity)).toBe(undefined);
    expect(toInt(-Infinity)).toBe(undefined);
    expect(toInt(NaN)).toBe(undefined);
  });

  test('handles large integers', () => {
    expect(toInt('9007199254740991')).toBe(9007199254740991); // Number.MAX_SAFE_INTEGER
    expect(toInt('-9007199254740991')).toBe(-9007199254740991);
  });
});

describe('compactWhitespace', () => {
  test('compacts multiple whitespace characters', () => {
    expect(compactWhitespace('hello    world')).toBe('hello world');
    expect(compactWhitespace('a  \n\t  b')).toBe('a b');
    expect(compactWhitespace('   multiple   spaces   ')).toBe('multiple spaces');
  });

  test('trims by default', () => {
    expect(compactWhitespace('  hello world  ')).toBe('hello world');
    expect(compactWhitespace('\n\t hello \t\n')).toBe('hello');
  });

  test('respects trim option', () => {
    expect(compactWhitespace('  hello    world  ', { trim: false })).toBe(' hello world ');
    expect(compactWhitespace('  hello    world  ', { trim: true })).toBe('hello world');
  });

  test('handles empty string', () => {
    expect(compactWhitespace('')).toBe('');
    expect(compactWhitespace('   ')).toBe('');
    expect(compactWhitespace('   ', { trim: false })).toBe(' ');
  });

  test('returns empty string for non-string input', () => {
    expect(compactWhitespace(null)).toBe('');
    expect(compactWhitespace(undefined)).toBe('');
    expect(compactWhitespace(123)).toBe('');
    expect(compactWhitespace({})).toBe('');
  });

  test('handles strings with only whitespace', () => {
    expect(compactWhitespace('\n\t   \r')).toBe('');
    expect(compactWhitespace('\n\t   \r', { trim: false })).toBe(' ');
  });
});

describe('createPreview', () => {
  test('creates preview with default max length', () => {
    const longText = 'a'.repeat(200);
    const preview = createPreview(longText);
    expect(preview.length).toBe(120);
    expect(preview).toBe('a'.repeat(120));
  });

  test('returns full text if shorter than max length', () => {
    const shortText = 'hello world';
    expect(createPreview(shortText)).toBe('hello world');
  });

  test('respects custom max length', () => {
    const text = 'a'.repeat(50);
    expect(createPreview(text, { maxLength: 10 })).toBe('a'.repeat(10));
  });

  test('compacts whitespace before applying length limit', () => {
    const text = 'hello    world    test';
    expect(createPreview(text, { maxLength: 15 })).toBe('hello world tes');
  });

  test('trims by default', () => {
    const text = '   hello    world   ';
    expect(createPreview(text, { maxLength: 10 })).toBe('hello worl');
  });

  test('respects trim option', () => {
    const text = '   hello world   ';
    expect(createPreview(text, { trim: false, maxLength: 10 })).toBe(' hello wor');
    expect(createPreview(text, { trim: true, maxLength: 10 })).toBe('hello worl');
  });

  test('returns empty string for non-string input', () => {
    expect(createPreview(null)).toBe('');
    expect(createPreview(undefined)).toBe('');
    expect(createPreview(123)).toBe('');
  });

  test('handles zero or negative max length', () => {
    const text = 'hello world';
    expect(createPreview(text, { maxLength: 0 })).toBe('hello world');
    expect(createPreview(text, { maxLength: -5 })).toBe('hello world');
  });

  test('handles complex whitespace scenarios', () => {
    const text = '  hello  \n\n  world  \t\t  test  ';
    const expected = 'hello world test';
    expect(createPreview(text, { maxLength: 100 })).toBe(expected);
  });
});