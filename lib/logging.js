const { inspect } = require('util');
const errorLogger = require('debug')('fhir-kit-client:error');
const infoLogger = require('debug')('fhir-kit-client:info');

function inspectObject(obj) {
  return inspect(obj, { depth: null, maxArrayLength: 5 });
}

function logRequestError(error) {
  if (!errorLogger.enabled) { return; }
  if (error.response) {
    errorLogger(`Error: ${error.response.status} ${error.response.statusText}`);
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

function logRequestInfo(action, url, axios) {
  if (!infoLogger.enabled) { return; }
  const headers = {};
  if (axios.defaults.headers) {
    Object.assign(headers, axios.defaults.headers.common, axios.defaults.headers[action]);
  }
  if (axios.headers) {
    Object.assign(headers, axios.headers.common, axios.headers[action]);
  }
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

module.exports = {
  logRequestError,
  logRequestInfo,
  logResponseInfo,
  logError,
};
