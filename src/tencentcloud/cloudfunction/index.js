const { makeSuccess, makeError } = require('../../response');
const {generateId} = require('../../id');
const {log} = require('../../log');
const {ERROR_CODE} = require('../../constants');

function entranceWrapper(cloud){
  log.level = process.env.LOG_LEVEL || 'info';

  const functionEntrance = require('./entrance');

  return async (event) => {
    const { OPENID } = cloud.getWXContext();

    const logger = log.getLogger({
      requestId: generateId('req'),
      openId: OPENID
    });

    logger.debug(`running cloud function with params ${Object.keys(event || {})}`);

    try{
      logger.debug(`ready to call function entrance`);

      const result = await functionEntrance(event, {
        cloud,
        openId: OPENID,
        logger,
        processEnv: process.env
      });

      logger.debug(`call function entrance done`);
      return makeSuccess(result);
    } catch(e){
      // Log full error details (including stack) for debugging
      logger.error(`call function entrance error: ${e.message}`, {
        stack: e.stack,
        code: e.code
      });
      // Return only safe error message to client (no stack trace)
      return makeError(ERROR_CODE.SERVER_ERROR, e);
    }
  }
}

module.exports = {entranceWrapper};
