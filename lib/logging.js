import { inspect } from 'util';
import errorLoggerFactory from 'debug';
const errorLogger = errorLoggerFactory('fhir-kit-client:error');
import infoLoggerFactory from 'debug';
const infoLogger = infoLoggerFactory('fhir-kit-client:info');

function inspectObject(obj) {
  return inspect(obj, { depth: null, maxArrayLength: 5 });
}

function logRequestError(error) {
  if (!errorLogger.enabled) { return; }
  if (error.response) {
    errorLogger(`Error: ${error.response.status}`);
  } else {
    errorLogger('An error occurred while making the request:');
  }
  if (error.config) {
    errorLogger(`    ${error.config.method.toUpperCase()} ${error.config.url}`);
    errorLogger(`    Headers: ${inspectObject(error.config.headers)}`);
  }

  if (error.response) {
    errorLogger(inspectObject(error.response.data));
  }
}

function logRequestInfo(action, url, headers) {
  if (!infoLogger.enabled) { return; }
  if (url) { infoLogger(`${action.toUpperCase()} ${url.toString()}`); }
  infoLogger(`Headers: ${inspectObject(headers)}`);
}

function logResponseInfo(response) {
  if (!infoLogger.enabled) { return; }
  infoLogger(`Response: ${response.status}`);
  infoLogger(inspectObject(response.data));
}

function logError(error) {
  if (!errorLogger.enabled) { return; }
  errorLogger(error);
}

export default {
  logRequestError,
  logRequestInfo,
  logResponseInfo,
  logError,
};
