const {isNil} = require('../lang/index.js');

/**
 * Standard success response
 * @param {any} data - The data to include in the success response
 * @return {Object}
 */
function makeSuccess(data) {
  return { success: true, data };
}

/**
 * @param {string|number} code - Error code (for programme read)
 * @param {string|Error} message - Error message (for human read) or Error object
 * @param {any} [data=null] - Additional error data
 * @return {Object}
 */
function makeError(code, message, data) {
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

    // Handle Error objects - extract only the message, not the stack
    if(message instanceof Error){
      result.error.message = message.message || 'An error occurred';
    } else {
      result.error.message = String(message);
    }
  }

  if(!isNil(data)){
    result.data = data;
  }

  return result;
}

module.exports = {
  makeSuccess,
  makeError
};
