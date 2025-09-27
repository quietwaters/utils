const {
  toBoolean,
  isNil,
} = require('../src/lang');

afterEach(() => {
  jest.restoreAllMocks();
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
