const stringify = require('json-stringify-safe');
const errorLogger = require('debug')('fhir-kit-client:error');
const infoLogger = require('debug')('fhir-kit-client:info');

function inspectObject(obj) {
  return stringify(obj);
}

function inspectHeaders(headers) {
  if (headers.raw && typeof headers.raw === 'function') {
    return (inspectObject(headers.raw()));
  }
  return inspectObject(headers);
}

function logRequestError(error) {
  if (!errorLogger.enabled) { return; }
  errorLogger('!!! Error');
  if (error.response) {
    errorLogger(`    Status: ${error.response.status}`);
  }
  if (error.config) {
    errorLogger(`    ${error.config.method.toUpperCase()}: ${error.config.url}`);
    errorLogger(`    Headers: ${inspectHeaders(error.config.headers)}`);
  }

  if (error.response && error.response.data) {
    errorLogger(inspectObject(error.response.data));
  }
  errorLogger('!!! Request Error');
}

function logRequestInfo(action, url, headers) {
  if (!infoLogger.enabled) { return; }
  if (url) { infoLogger(`Request: ${action.toUpperCase()} ${url.toString()}`); }
  infoLogger(`Request Headers: ${inspectHeaders(headers)}`);
}

function logResponseInfo(response) {
  if (!infoLogger.enabled) { return; }
  infoLogger(`Response: ${response.status}`);
  if (response.data) {
    infoLogger(inspectObject(response.data));
  }
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
