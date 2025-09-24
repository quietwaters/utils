import {toBoolean, isNil, makeError, makeSuccess} from './index';

function readEnv(envParams, envValues){
  const result = {};
  const invalidEnvs = {};

  Object.keys(envParams).forEach((envName) => {
    const originalValue = envValues[envName];
    let parsedValue;

    const envDef = envParams[envName];

    if(isNil(originalValue)){
      parsedValue = envDef.defaultValue;
    } else {
      switch(envDef.type){
        case String:
          parsedValue = String(originalValue);
          break;
        case Number:
          parsedValue = Number(originalValue);
          break;
        case Boolean:
          parsedValue = toBoolean(originalValue);
          break;
        default:
          parsedValue = envDef.func && envDef.func(originalValue);
          break;
      }
    }

    if(envDef.required && (isNil(parsedValue) || isNaN(parsedValue))){
      invalidEnvs.push({name: envName, value: parsedValue});
    }
  });

  if(invalidEnvs.length > 0){
    return makeError('INVALID_ENV', invalidEnvs);
  }

  return makeSuccess(result);
}

export {
  readEnv
}
