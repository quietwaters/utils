import { jest } from '@jest/globals';
import {
  readEnv,
} from '../src/env';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('test readEnv', () => {
  test('readEnv parses environment variables with validation', () => {
    const envParams = {
      PORT: { type: Number, required: true },
      DEBUG: { type: Boolean, defaultValue: false },
      API_KEY: { type: String, required: true },
      OPTIONAL: { type: String, defaultValue: 'default' }
    };

    const envValues = {
      PORT: '3000',
      DEBUG: 'true',
      API_KEY: 'secret123'
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      PORT: 3000,
      DEBUG: true,
      API_KEY: 'secret123',
      OPTIONAL: 'default'
    });
  });

  test('readEnv throws error for missing required values', () => {
    const envParams = {
      REQUIRED_VAR: { type: String, required: true }
    };
    const envValues = {};

    expect(() => readEnv(envParams, envValues)).toThrow('invalid env');
  });

  test('readEnv defaults to String type when no type specified', () => {
    const envParams = {
      NO_TYPE_STRING: { defaultValue: 'default' },
      NO_TYPE_NUMBER: { defaultValue: 'default' },
      NO_TYPE_BOOLEAN: { defaultValue: 'default' }
    };

    const envValues = {
      NO_TYPE_STRING: 'text',
      NO_TYPE_NUMBER: 123,
      NO_TYPE_BOOLEAN: true
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      NO_TYPE_STRING: 'text',
      NO_TYPE_NUMBER: '123',
      NO_TYPE_BOOLEAN: 'true'
    });
  });

  test('readEnv handles Number type conversions', () => {
    const envParams = {
      VALID_NUM: { type: Number, defaultValue: 0 },
      ZERO: { type: Number, defaultValue: -1 },
      NEGATIVE: { type: Number, defaultValue: 1 },
      FLOAT: { type: Number, defaultValue: 0 }
    };

    const envValues = {
      VALID_NUM: '42',
      ZERO: '0',
      NEGATIVE: '-123',
      FLOAT: '3.14'
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      VALID_NUM: 42,
      ZERO: 0,
      NEGATIVE: -123,
      FLOAT: 3.14
    });
  });

  test('readEnv throws error for invalid Number values when required', () => {
    const envParams = {
      INVALID_NUM: { type: Number, required: true }
    };
    const envValues = {
      INVALID_NUM: 'not_a_number'
    };

    expect(() => readEnv(envParams, envValues)).toThrow('invalid env');
  });

  test('readEnv uses defaultValue for invalid Number when not required', () => {
    const envParams = {
      INVALID_NUM: { type: Number, required: false, defaultValue: 999 }
    };
    const envValues = {
      INVALID_NUM: 'not_a_number'
    };

    const result = readEnv(envParams, envValues);
    expect(result.INVALID_NUM).toBeNaN();
  });

  test('readEnv handles Boolean type conversions', () => {
    const envParams = {
      BOOL_TRUE: { type: Boolean, defaultValue: false },
      BOOL_FALSE: { type: Boolean, defaultValue: true },
      BOOL_ONE: { type: Boolean, defaultValue: false },
      BOOL_ZERO: { type: Boolean, defaultValue: true },
      BOOL_YES: { type: Boolean, defaultValue: false },
      BOOL_NO: { type: Boolean, defaultValue: true }
    };

    const envValues = {
      BOOL_TRUE: 'true',
      BOOL_FALSE: 'false',
      BOOL_ONE: '1',
      BOOL_ZERO: '0',
      BOOL_YES: 'yes',
      BOOL_NO: 'no'
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      BOOL_TRUE: true,
      BOOL_FALSE: false,
      BOOL_ONE: true,
      BOOL_ZERO: false,
      BOOL_YES: true,
      BOOL_NO: false
    });
  });

  test('readEnv handles String type conversions', () => {
    const envParams = {
      STR_NUM: { type: String, defaultValue: '' },
      STR_BOOL: { type: String, defaultValue: '' },
      STR_EMPTY: { type: String, defaultValue: 'default' }
    };

    const envValues = {
      STR_NUM: 123,
      STR_BOOL: true,
      STR_EMPTY: ''
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      STR_NUM: '123',
      STR_BOOL: 'true',
      STR_EMPTY: ''
    });
  });

  test('readEnv treats undefined type as String (custom func not currently supported)', () => {
    const envParams = {
      CUSTOM_FIELD: {
        func: (val) => val.split(','), // func is ignored, treated as String type
        required: false,
        defaultValue: []
      },
      ANOTHER_FIELD: {
        func: (val) => val.toUpperCase(), // func is ignored, treated as String type
        required: true
      }
    };

    const envValues = {
      CUSTOM_FIELD: 'a,b,c',
      ANOTHER_FIELD: 'hello world'
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      CUSTOM_FIELD: 'a,b,c', // Treated as string, not split
      ANOTHER_FIELD: 'hello world' // Treated as string, not uppercased
    });
  });

  test('readEnv uses defaultValues when values are missing', () => {
    const envParams = {
      WITH_DEFAULT: { type: String, defaultValue: 'default_value' },
      NUM_DEFAULT: { type: Number, defaultValue: 42 },
      BOOL_DEFAULT: { type: Boolean, defaultValue: true }
    };

    const envValues = {}; // No values provided

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      WITH_DEFAULT: 'default_value',
      NUM_DEFAULT: 42,
      BOOL_DEFAULT: true
    });
  });

  test('readEnv handles mixed scenarios', () => {
    const envParams = {
      REQUIRED_STR: { type: String, required: true },
      OPTIONAL_NUM: { type: Number, defaultValue: 100 },
      BOOLEAN_FIELD: { type: Boolean, required: true },
      NO_TYPE_FIELD: { defaultValue: 'no_type_default' }
    };

    const envValues = {
      REQUIRED_STR: 'provided',
      BOOLEAN_FIELD: 'true'
      // OPTIONAL_NUM and NO_TYPE_FIELD not provided, should use defaults
    };

    const result = readEnv(envParams, envValues);
    expect(result).toEqual({
      REQUIRED_STR: 'provided',
      OPTIONAL_NUM: 100,
      BOOLEAN_FIELD: true,
      NO_TYPE_FIELD: 'no_type_default'
    });
  });

  test('readEnv error includes invalid environment details', () => {
    const envParams = {
      REQUIRED1: { type: String, required: true },
      REQUIRED2: { type: Number, required: true }
    };
    const envValues = {
      REQUIRED2: 'not_a_number'
    };

    try {
      readEnv(envParams, envValues);
    } catch (error) {
      expect(error.message).toBe('invalid env');
      expect(error.cause).toEqual([
        { name: 'REQUIRED1', value: undefined },
        { name: 'REQUIRED2', value: NaN }
      ]);
    }
  });
});
