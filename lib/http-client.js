const got = require('got');
const HttpAgent = require('agentkeepalive');
const { HttpsAgent } = require('agentkeepalive');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

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
module.exports = class {
  /**
   * Create an HTTP client.
   *
   * @param {Object} config HTTP Client configuration
   * @param {String} config.baseUrl Base URL used to resolve relative paths
   * @param {Object} [config.customHeaders] Custom headers to send for all
   *                 requests
   * @param {Object} [config.requestOptions] Additional options for fetch/agent
   * @throws An error will be thrown on unsuccessful requests.
   */
  constructor({ baseUrl, customHeaders = {}, requestOptions = {} }) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders;
    this.baseRequestOptions = requestOptions;
    this.baseAgent = requestOptions.agent || agentBuilder();
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
    return {
      ...this.baseRequestOptions,
      ...options,
      headers: this.mergeHeaders(options.headers),
      method,
      url,
      agent: options.agent || this.baseAgent || undefined,
      body: stringifyBody(body),
    };
  }

  async request(method, requestUrl, options = {}, body) {
    const url = this.expandUrl(requestUrl);

    const request = this.requestBuilder(method, url, options, body);
    logRequestInfo(method, url, request.headers);

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
        throw responseErrorBuilder({ status, data, method, request, url });
      }
    }
    if (!ok) {
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
    return {
      ...defaultHeaders,
      ...this.authHeader,
      ...this.customHeaders,
      ...requestHeaders,
    };
  }
};
