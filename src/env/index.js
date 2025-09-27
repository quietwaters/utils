const { isNil, toBoolean } = require('../lang/index.js');

function readEnv(envParams, envValues){
  const result = {};
  const invalidEnvs = [];

  Object.keys(envParams).forEach((envName) => {
    const originalValue = envValues[envName];
    let parsedValue;

    const envDef = envParams[envName];

    if(isNil(originalValue)){
      parsedValue = envDef.defaultValue;
    } else {
      switch(envDef.type){
        case Number:
          parsedValue = Number(originalValue);
          break;
        case Boolean:
          parsedValue = toBoolean(originalValue);
          break;
        default:
          parsedValue = String(originalValue);
          break;
      }
    }

    if(envDef.required && (isNil(parsedValue) || (envDef.type === Number && isNaN(parsedValue)) || parsedValue === '')){
      invalidEnvs.push({name: envName, value: parsedValue});
    } else {
      result[envName] = parsedValue;
    }
  });

  if(invalidEnvs.length > 0){
    throw new Error('invalid env', {cause: invalidEnvs});
  }

  return result;
}

module.exports = {
  readEnv
};
