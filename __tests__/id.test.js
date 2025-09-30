const crypto = require('crypto');
const {
  generateId,
} = require('../src/id');

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

  test('generateId throws error when crypto.randomBytes fails', () => {
    const randomBytesSpy = jest.spyOn(crypto, 'randomBytes');

    randomBytesSpy.mockImplementation(() => {
      throw new Error('no entropy');
    });

    expect(() => generateId()).toThrow('no entropy');
  });

  test('generateId with prefix', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    const randomBytesSpy = jest.spyOn(crypto, 'randomBytes');

    dateSpy.mockReturnValue(1700000000000);
    randomBytesSpy.mockReturnValue(Buffer.from('aabbccddeeff', 'hex'));

    expect(generateId('abc')).toBe(`abc${(1700000000000).toString(16)}-aabbccddeeff`);
  });
});
