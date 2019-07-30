require('es6-promise').polyfill();
require('cross-fetch/polyfill');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

const responseAttributeKey = '__response';
const requestAttributeKey = '__request';

// See if http and https is defined (e.g. Node)
// if so, we need to create a new agent for fetch with options,
// including keep-alive. Otherwise pass them in to the request.
let agentIsAvailable = false;
let HttpAgent;
let HttpsAgent;

try {
  require('http');
  require('https');
  HttpAgent = require('agentkeepalive');
  HttpsAgent = require('agentkeepalive').HttpsAgent;
  agentIsAvailable = true;
} catch (_e) {
  logRequestInfo('HTTP Agent is not available');
}

// Create and cache the agent per base URL and options:
const agentCache = new WeakMap();
function agentBuilder(baseUrl, agentOptions = {}) {
  const key = { baseUrl, agentOptions };

  if (!agentIsAvailable) { return {}; }
  if (agentCache.get(key)) { return agentCache.get(key); }

  if (baseUrl.startsWith('https')) {
    agentCache.set(key, { agent: new HttpsAgent(agentOptions) });
  } else {
    agentCache.set(key, { agent: new HttpAgent(agentOptions) });
  }
  return agentCache.get(key);
}

function responseErrorBuilder({
  status,
  data,
  method,
  headers,
  url,
}) {
  const error = {
    response: {
      status,
      data,
    },
    config: {
      method,
      url,
      headers,
    },
  };

  logRequestError(error);
  return error;
}

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
   * @param {Object} [config.requestOptions] Additional options for fetch/agent
   * @throws An error will be thrown on unsuccessful requests.
   */
  constructor({ baseUrl, customHeaders = {}, requestOptions = {} }) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders;
    this.baseRequestOptions = requestOptions;
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

  static requestFor(requestResponse) {
    return requestResponse[requestAttributeKey];
  }

  set bearerToken(token) {
    const header = `Bearer ${token}`;
    this.authHeader = { authorization: header };
  }

  requestBuilder(method, url, options, body) {
    const requestOptions = {
      ...this.baseRequestOptions,
      ...options,
      method,
      body: stringifyBody(body),
    };

    let keepalive = {};
    if (!agentIsAvailable) {
      keepalive = {
        keepalive: Object.prototype.hasOwnProperty.call(requestOptions, 'keepalive')
          ? requestOptions.keepalive : true,
      };
    }

    Object.assign(requestOptions,
      keepalive,
      { headers: new Headers(this.mergeHeaders(options.headers)) },
      agentBuilder(this.baseUrl, requestOptions));

    return new Request(url, requestOptions);
  }

  async request(method, requestUrl, options = {}, body) {
    const url = this.expandUrl(requestUrl);

    const request = this.requestBuilder(method, url, options, body);
    logRequestInfo(method, url, request.headers);

    const response = await fetch(request);
    const { status } = response;
    logResponseInfo({ status, response });

    const bodyText = await response.text();

    let data = {};
    if (bodyText) {
      try {
        data = JSON.parse(bodyText);
      } catch (_error) {
        data = bodyText;
        throw responseErrorBuilder({ status, data, method, request, url });
      }
    }

    if (!response.ok) {
      throw responseErrorBuilder({ status, data, method, request, url });
    }

    // Add __response and __request
    Object.defineProperty(data, responseAttributeKey, {
      writable: false,
      enumerable: false,
      value: response,
    });

    Object.defineProperty(data, requestAttributeKey, {
      writable: false,
      enumerable: false,
      value: request,
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
