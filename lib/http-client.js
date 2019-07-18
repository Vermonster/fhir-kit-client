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
let HttpAgent;
let HttpsAgent;

try {
  http = require('http');
  https = require('https');
  agentIsAvailable = true;
  HttpAgent = require('agentkeepalive');
  HttpsAgent = HttpAgent.HttpsAgent;
} catch (_e) {
  logRequestInfo('Agent is not available');
}

const agentCache = {};

function agentGenerator(url, agentOptions = {}) {
  if (!agentIsAvailable) { return {}; }

  if (agentCache[url]) { return agentCache[url]; }

  if (url.startsWith('https')) {
    agentCache[url] = { agent: new HttpsAgent(agentOptions) };
  } else {
    agentCache[url] = { agent: new HttpAgent(agentOptions) };
  }
  return agentCache[url];
}

/* eslint-disable no-param-reassign */
function responseError({
  status,
  data,
  httpVerb,
  headers,
  url,
}) {
  const error = {
    response: {
      status,
      data,
    },
    config: {
      method: httpVerb,
      url,
      headers,
    },
  };

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
   * @param {Object} [config.baseRequestOptions] Additional options for fetch
   * @throws An error will be thrown on unsuccessful requests.
   */
  constructor({ baseUrl, customHeaders = {}, baseRequestOptions = {} }) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders || {};
    this.baseRequestOptions = baseRequestOptions || {};
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

  /*
   * Create a request given a verb, url, request options and body.
   *
   * This uses the fetch library to create a new request. Options
   * passed in the constructor are used, along with any additional
   * options passed here.
   */
  async request(httpVerb, url, options = {}, body) {
    const headers = new Headers(this.mergeHeaders(options.headers));
    const fullUrl = this.expandUrl(url);

    logRequestInfo(httpVerb, fullUrl, headers);

    const requestOptions = this.baseRequestOptions;

    let keepalive = {};
    if (!agentIsAvailable) {
      keepalive = {
        keepalive: Object.prototype.hasOwnProperty.call(options, 'keepalive')
          ? options.keepalive : true,
      };
    }

    Object.assign(requestOptions,
      options,
      {
        keepalive,
        headers,
        method: httpVerb,
        body: stringifyBody(body),
      });

    Object.assign(requestOptions,
      agentGenerator(fullUrl, requestOptions));

    const rawRequest = new Request(fullUrl, requestOptions);
    const rawResponse = await fetch(rawRequest);
    const { status } = rawResponse;

    // define a new property on the rawRequest, called response
    // and set it to the raw request.
    Object.defineProperty(rawResponse, 'request', {
      writable: false,
      enumerable: false,
      value: rawRequest,
    });

    logResponseInfo({ status, rawResponse });

    let data = '';
    try {
      data = await rawResponse.json();
    } catch (_e) {
      try {
        data = await rawResponse.text();
        throw responseError({ status, data, httpVerb, headers, url: fullUrl }); 
      } catch (_e) {
        data = 'An error occurred';
        throw responseError({ status, data, httpVerb, headers, url: fullUrl });  
      }
    }

    if (!rawResponse.ok) {
      throw responseError({ status, data, httpVerb, headers, url: fullUrl });  
    }
    Object.defineProperty(data, responseAttributeKey, {
      writable: false,
      enumerable: false,
      value: rawResponse,
    });
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
