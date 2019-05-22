require('es6-promise').polyfill();
const request = require('request-promise-native');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

/* eslint-disable no-param-reassign */
function responseError({
  error,
  status,
  rawData,
  httpVerb,
  url,
  headers,
}) {
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    data = rawData;
  }
  error.response.status = status;
  error.response.data = data;
  error.config = { method: httpVerb, url, headers };
  logRequestError(error);
  return error;
}
/* eslint-enable no-param-reassign */

/**
 * Class used by Client to make HTTP requests. Do not use this class directly,
 * use Client#read, Client#create, etc.
 *
 * @private
 */
module.exports = class {
  /**
   * Create an HTTP client.
   *
   * @param {Object} config HTTP Client configuration
   * @param {String} config.baseUrl Base URL used to resolve relative paths
   * @param {Object} [config.customHeaders] Custom headers to send with each
   *   request
   * @throws An error will be thrown on unsuccessful requests.
   */
  constructor({ baseUrl, customHeaders = {}, key, cert }) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders || {};
    this.key = key;
    this.cert = cert;
  }

  set bearerToken(token) {
    const header = `Bearer ${token}`;
    this.authHeader = { authorization: header };
  }

  async request(httpVerb, url, options = {}, body) {
    const headers = this.mergeHeaders(options.headers);
    const fullUrl = this.expandUrl(url);
    let status;
    let error;
    logRequestInfo(httpVerb, fullUrl, headers);

    const requestParams = {
      uri: fullUrl,
      headers,
      method: httpVerb,
      body: JSON.stringify(body),
      forever: true,
      resolveWithFullResponse: true
    };

    if (this.cert) { requestParams.cert = this.cert; }
    if (this.key) { requestParams.key = this.key; }

    function assignProperty(object, value, property) {
      Object.defineProperty(object, property, {
        enumerable : false,
        value : value
      });
    }

    const data = await request(requestParams)
      .then((response) => {
        status = response.statusCode;

        let r = response.body ? JSON.parse(response.body) : response.headers;
        
        assignProperty(r,response.headers, Symbol.for('fhir-kit-client-headers'));
        assignProperty(r,status, Symbol.for('fhir-kit-client-statusCode'));
        if (response.headers.location) {
          assignProperty(r,response.headers.location, Symbol.for('fhir-kit-client-location'));
        }

        return r;
      }).catch((errorResponse) => {
        status = errorResponse.statusCode;
        error = errorResponse;
        return errorResponse.error;
      });

    logResponseInfo({ status, data });

    if (error) {
      throw responseError({
        error,
        status,
        httpVerb,
        headers,
        rawData: data,
        url: fullUrl,
      });
    }
    return data;
  }

  async get(url, options) {
    return this.request('get', url, options);
  }

  async delete(url, options) {
    return this.request('delete', url, options);
  }

  async put(url, body, options) {
    return this.request('put', url, options, body);
  }

  async post(url, body, options) {
    return this.request('post', url, options, body);
  }

  async patch(url, body, options) {
    return this.request('patch', url, options, body);
  }

  expandUrl(url = '') {
    if (url.startsWith('http')) {
      return url;
    }
    if (this.baseUrl.endsWith('/') && url.startsWith('/')) {
      return this.baseUrl + url.slice(1);
    }
    if (this.baseUrl.endsWith('/') || url.startsWith('/')) {
      return this.baseUrl + url;
    }
    return `${this.baseUrl}/${url}`;
  }

  mergeHeaders(requestHeaders) {
    return Object.assign(
      {},
      defaultHeaders,
      this.authHeader,
      this.customHeaders,
      requestHeaders,
    );
  }
};
