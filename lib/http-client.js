require('es6-promise').polyfill();
require('cross-fetch/polyfill');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

const responseAttributeKey = '__response';
const requestAttributeKey = '__request';

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
  HttpAgent = require('agentkeepalive');
  HttpsAgent = HttpAgent.HttpsAgent;
  agentIsAvailable = true;
} catch (_e) {
  logRequestInfo('HTTP Agent is not available');
}

const agentCache = {};

// TODO: The key of the cache should be the protocol + hostname
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
    this.customHeaders = customHeaders;
    this.baseRequestOptions = baseRequestOptions;
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

  /**
   *  Allow access to the raw response object
   *
   * @example
   *
   * const response = await httpClient.read(...)
   * const rawResponse = httpClient.responseFor(response)
   *
   * @param {Object} requestResponse the response from an http client request
   * @returns {Object} response object (see Fetch documentation)
   */
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


  requestGenerator(httpVerb, url, options, body) {
    const fullUrl = this.expandUrl(url);
    // eslint-disable-next-line no-undef
    const headers = new Headers(this.mergeHeaders(options.headers));

    logRequestInfo(httpVerb, fullUrl, headers);

    const requestOptions = {
      ...this.baseRequestOptions,
      ...options,
      headers: headers,
      method: httpVerb,
      body: stringifyBody(body),
    };
    console.log(headers);
    let keepalive = {};
    if (!agentIsAvailable) {
      keepalive = {
        keepalive: Object.prototype.hasOwnProperty.call(requestOptions, 'keepalive')
          ? requestOptions.keepalive : true,
      };
    }

    Object.assign(requestOptions,
      keepalive,
      agentGenerator(fullUrl, requestOptions));
    // eslint-disable-next-line no-undef
    return new Request(fullUrl, requestOptions);
  }

  /**
   * Create a request given a verb, url, request options and body.
   *
   * This uses the fetch library to create a new request. Options
   * passed in the constructor are used, along with any additional
   * options passed here.
   */
  async request(httpVerb, url, options = {}, body) {
    const rawRequest = this.requestGenerator(httpVerb, url, options, body);
    const fullUrl = this.expandUrl(url);
    // console.log(rawRequest.headers);
    // construct request and fetch...
    const rawResponse = await fetch(rawRequest);
    const { status } = rawResponse;


    logResponseInfo({ status, rawResponse });

    const bodyText = await rawResponse.text();
    let data = {};
    if (bodyText) {
      try {
        data = JSON.parse(bodyText);
      } catch (_e) {
        data = bodyText;
        throw responseError({ status, data, httpVerb, headers, url: fullUrl });
      }
    }

    if (!rawResponse.ok) {
      throw responseError({ status, data, httpVerb, headers, url: fullUrl });  
    }

    // Add our special __response key
    Object.defineProperty(data, responseAttributeKey, {
      writable: false,
      enumerable: false,
      value: rawResponse,
    });

    // Add our special __request
    Object.defineProperty(data, requestAttributeKey, {
      writable: false,
      enumerable: false,
      value: rawRequest,
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
