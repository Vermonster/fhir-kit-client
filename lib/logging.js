import debugFactory from 'debug';

const errorLogger = debugFactory('fhir-kit-client:error');
const infoLogger = debugFactory('fhir-kit-client:info');

function inspectObject(obj) {
  return obj ? JSON.stringify(obj) : null;
}

export const logRequestError = function logRequestError(error) {
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
};

export const logRequestInfo = function logRequestInfo(action, url, headers) {
  if (!infoLogger.enabled) { return; }
  if (url) { infoLogger(`${action.toUpperCase()} ${url.toString()}`); }
  infoLogger(`Headers: ${inspectObject(headers)}`);
};

export const logResponseInfo = function logResponseInfo(response) {
  if (!infoLogger.enabled) { return; }
  infoLogger(`Response: ${response.status}`);
  if (response.requestResponse) {
    infoLogger(inspectObject(response.requestResponse));
  } else {
    infoLogger(inspectObject(response));
  }
};

export const logError = function logError(error) {
  if (!errorLogger.enabled) { return; }
  errorLogger(error);
};
