const { makeSuccess, makeError } = require('../../response');
const {generateId} = require('../../id');
const {log} = require('../../log');
const {ERROR_CODE} = require('../../constants');

function entranceWrapper(cloud, cloudFunctionName){
  log.level = process.env.LOG_LEVEL || 'info';

  const functionEntrance = require('./' + cloudFunctionName);

  return async (event) => {
    const { OPENID } = cloud.getWXContext();

    const logger = log.getLogger({
      requestId: generateId('req'),
      openId: OPENID
    });

    logger.debug(`running cloud function: ${cloudFunctionName}, with params ${Object.keys(event || {})}`);

    try{
      logger.debug(`ready to call function entrance ${cloudFunctionName}`);

      const result = await functionEntrance(event, {
        cloud,
        openId: OPENID,
        logger,
        processEnv: process.env
      });

      logger.debug(`call function entrance ${cloudFunctionName} done`);
      return makeSuccess(result);
    } catch(e){
      logger.error(`call function entrance ${cloudFunctionName} error: ${e}`);
      return makeError(ERROR_CODE.SERVER_ERROR, `${e}` || 'server error');
    }
  }
}

module.exports = {entranceWrapper};
