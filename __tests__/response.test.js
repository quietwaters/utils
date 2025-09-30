const {
  makeSuccess,
  makeError,
} = require('../src/response');

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

  test('makeError handles Error objects safely without exposing stack traces', () => {
    const error = new Error('Database connection failed');
    error.stack = 'Error: Database connection failed\n    at Object.<anonymous> (/home/user/app.js:10:15)';

    const result = makeError('DB_ERROR', error);

    expect(result).toEqual({
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Database connection failed'
      }
    });

    // Verify stack trace is not included
    expect(JSON.stringify(result)).not.toContain('/home/user/app.js');
    expect(JSON.stringify(result)).not.toContain('at Object.<anonymous>');
  });

  test('makeError handles Error objects with empty message', () => {
    const error = new Error('');

    const result = makeError('UNKNOWN_ERROR', error);

    expect(result).toEqual({
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred'
      }
    });
  });

  test('makeError handles Error-like objects', () => {
    const errorLike = {
      message: 'Custom error',
      code: 'CUSTOM'
    };

    // This will be treated as a regular object, not an Error
    const result = makeError('ERROR_CODE', errorLike);

    expect(result).toEqual({
      success: false,
      error: {
        code: 'ERROR_CODE',
        message: '[object Object]'
      }
    });
  });

  test('makeError converts non-string messages to strings', () => {
    expect(makeError('CODE', 123)).toEqual({
      success: false,
      error: {
        code: 'CODE',
        message: '123'
      }
    });

    expect(makeError('CODE', true)).toEqual({
      success: false,
      error: {
        code: 'CODE',
        message: 'true'
      }
    });
  });
});
