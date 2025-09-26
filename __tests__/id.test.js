import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import {
  generateId,
} from '../src/id';

afterEach(() => {
  jest.restoreAllMocks();
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
