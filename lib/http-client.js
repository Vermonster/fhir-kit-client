const got = require('got');
const HttpAgent = require('agentkeepalive');
const { HttpsAgent } = require('agentkeepalive');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/fhir+json' };

const responseAttributeKey = '__response';
const requestAttributeKey = '__request';

function agentBuilder() {
  return {
    http: new HttpAgent(),
    https: new HttpsAgent(),
  };
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
module.exports = class HttpClient {
  // Utility to lowercase 1st level keys in an object.
  static lcKeys(obj) {
    return obj
      ? Object.fromEntries(Object.entries(obj).map(([key, value]) => [key.toLowerCase(), value]))
      : obj;
  }

  /**
   * Create an HTTP client.
   *
   * @param {Object} config HTTP Client configuration
   * @param {String} config.baseUrl Base URL used to resolve relative paths
   * @param {Object} [config.customHeaders] Optional Custom headers to send for all
   *                 requests
   * @param {Object} [config.requestOptions] Optional Additional options for fetch/agent
   * @param {Function} [config.requestSigner] Optional pass in a function to sign the request.
   * @throws An error will be thrown on unsuccessful requests.
   */
  constructor({ baseUrl, customHeaders = {}, requestOptions = {}, requestSigner = undefined }) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders;
    this.baseRequestOptions = requestOptions;
    this.baseAgent = requestOptions.agent || agentBuilder();
    this.requestSigner = requestSigner;
  }

  set baseUrl(url) {
    if (!url) {
      throw new Error('baseUrl cannot be blank');
    }
    if (typeof url !== 'string') {
      throw new TypeError('baseUrl must be a string');
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
    const request = {
      ...this.baseRequestOptions,
      ...options,
      headers: this.mergeHeaders(options.headers),
      method,
      url,
      agent: options.agent || this.baseAgent || undefined,
      body: stringifyBody(body),
    };
    if (this.requestSigner) {
      this.requestSigner(url, request);
    }
    return request;
  }

  async request(method, requestUrl, options = {}, body) {
    const url = this.expandUrl(requestUrl);

    const request = this.requestBuilder(method, url, options, body);
    const { headers } = request;
    logRequestInfo(method, url, headers);

    let response;
    let ok = true;

    try {
      response = await got(request);
    } catch (error) {
      ok = false;
      if (!error.response) {
        throw error;
      }
      response = error.response;
    }

    const status = response.statusCode;
    logResponseInfo({ status, response });

    const bodyText = response.body;

    let data = {};
    if (bodyText) {
      try {
        data = JSON.parse(bodyText);
      } catch {
        data = bodyText;
        throw responseErrorBuilder({ status, data, method, headers, url });
      }
    }
    if (!ok) {
      throw responseErrorBuilder({ status, data, method, headers, url });
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
    return this.request('GET', url, options);
  }

  async delete(url, options) {
    return this.request('DELETE', url, options);
  }

  async put(url, body, options = {}) {
    const headers = {
      'content-type': 'application/fhir+json',
      ...HttpClient.lcKeys(options.headers),
    };
    const putOptions = { ...options, headers };

    return this.request('PUT', url, putOptions, body);
  }

  async post(url, body, options = {}) {
    const headers = {
      'content-type': 'application/fhir+json',
      ...HttpClient.lcKeys(options.headers),
    };
    const postOptions = { ...options, headers };

    return this.request('POST', url, postOptions, body);
  }

  async patch(url, body, options) {
    return this.request('PATCH', url, options, body);
  }

  expandUrl(url = '') {
    if (url.toLowerCase().startsWith('http')) {
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
    const { lcKeys } = HttpClient;

    return {
      ...lcKeys(defaultHeaders),
      ...lcKeys(this.authHeader),
      ...lcKeys(this.customHeaders),
      ...lcKeys(requestHeaders),
    };
  }
};
