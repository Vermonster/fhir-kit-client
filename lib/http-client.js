require('es6-promise').polyfill();
require('cross-fetch/polyfill');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

const responseAttributeKey = '__response';

// test to see if http and https is defined (e.g. Node)
// if so, we need to create a new agent for fetch with options, 
// including keep-alive. Otherwise pass them in to the request.
let agentIsAvailable = false;
let http;
let https;

try {
  http = require('http');
  https = require('https');
  agentIsAvailable = true;
} catch (_e) {
  logRequestInfo("Agent is not available")
}

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
  constructor({ baseUrl, customHeaders = {}, requestOptions = {} }) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders || {};
    this.requestOptions = requestOptions || {};
  }

  set baseUrl(url) {
    if (!url) {
      throw new Error('baseUrl cannot be blank');
    }
    if (typeof url !== 'string') {
      throw new Error('baseUrl must be a string');
    }
    this.baseUrlValue = url;
  }

  get baseUrl() {
    return this.baseUrlValue;
  }

  static responseFor(requestResponse) {
    return requestResponse[responseAttributeKey];
  }

  set bearerToken(token) {
    const header = `Bearer ${token}`;
    this.authHeader = { authorization: header };
  }

  agentGenerator(url, agentOptions = {}) {
    agentOptions.keepAlive = true;
    if (url.startsWith('https')) {
      return new https.Agent(agentOptions);
    }
    return new http.Agent(agentOptions);
  }

  async request(httpVerb, url, options = {}, body) {
    const headers = new Headers(this.mergeHeaders(options.headers));
    const fullUrl = this.expandUrl(url);

    logRequestInfo(httpVerb, fullUrl, headers);

    const requestParams = {
      headers,
      method: httpVerb,
      body: stringifyBody(body)
    };

    if (agentIsAvailable) {
      requestParams.agent = this.agentGenerator(fullUrl, this.requestOptions);
    } else {
      Object.assign(requestParams, 
        this.requestOptions,
        { keepalive: true }
      );
    }

    const rawRequest = new Request(fullUrl, requestParams);
    const rawResponse = await fetch(rawRequest);

    // define a new property on the rawRequest, called response
    // and set it to the raw request.
    Object.defineProperty(rawResponse, 'request', {
      writable: false,
      enumerable: false,
      value: rawRequest,
    });

    const status = rawResponse.statusCode;
    logResponseInfo({ status, rawResponse });

    if (rawResponse.ok) {
      const jsonResponse = await rawResponse.json() || {};
      Object.defineProperty(jsonResponse, responseAttributeKey, {
        writable: false,
        enumerable: false,
        value: rawResponse,
      });
      return jsonResponse;
    }

    throw responseError({ rawResponse, httpVerb, headers, url: fullUrl });
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
