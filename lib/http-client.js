require('es6-promise').polyfill();
const request = require('request-promise-native');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

const responseAttributeKey = '__response';

/* eslint-disable no-param-reassign */
function responseError({
  error,
  httpVerb,
  headers,
  url,
}) {
  error.response = error.response || {};

  const { response } = error;
  const { body: rawData } = response;

  let data;
  try {
    data = JSON.parse(rawData);
  } catch (_e) {
    data = rawData;
  }

  error.response.status = error.statusCode;
  error.response.data = data;
  error.config = { method: httpVerb, url, headers };

  logRequestError(error);
  return error;
}
/* eslint-enable no-param-reassign */

function stringifyBody(body) {
  if (typeof body === 'string') {
    return body;
  }
  return JSON.stringify(body);
}

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
  constructor({ baseUrl, customHeaders = {} }) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders || {};
  }

  static responseFor(requestResponse) {
    return requestResponse[responseAttributeKey];
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
      body: stringifyBody(body),
      forever: true,
      resolveWithFullResponse: true,
    };

    const requestResponse = await request(requestParams)
      .then((response) => {
        status = response.statusCode;
        const bodyWithResponse = JSON.parse(response.body) || {};
        Object.defineProperty(bodyWithResponse, responseAttributeKey, {
          writable: false,
          enumerable: false,
          value: response,
        });
        return bodyWithResponse;
      }).catch((errorResponse) => {
        status = errorResponse.statusCode;
        error = errorResponse;
        return errorResponse.error;
      });

    logResponseInfo({ status, requestResponse });

    if (error) {
      throw responseError({ error, httpVerb, headers, url: fullUrl });
    }

    return requestResponse;
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
