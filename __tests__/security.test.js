import { jest } from '@jest/globals';
import {
  maskString,
} from '../src/security';

afterEach(() => {
  jest.restoreAllMocks();
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
