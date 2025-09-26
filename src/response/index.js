import {isNil} from '../lang/index.js';

/**
 * Standard success response
 * @param {any} data - The data to include in the success response
 * @return {Object}
 */
export function makeSuccess(data) {
  return { success: true, data };
}

/**
 * @param {string|number} code - Error code (for programme read)
 * @param {string} message - Error message (for human read)
 * @param {any} [data=null] - Additional error data
 * @return {Object}
 */
export function makeError(code, message, data) {
  const result = {success: false};

  if(!isNil(code)){
    if(!result.error){
      result.error = {};
    }
    result.error.code = code;
  }

  if(!isNil(message)){
    if(!result.error){
      result.error = {};
    }
    result.error.message = message;
  }

  if(!isNil(data)){
    result.data = data;
  }

  return result;
}
