import { jest } from '@jest/globals';
import {
  makeSuccess,
  makeError,
} from '../src/response';

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
