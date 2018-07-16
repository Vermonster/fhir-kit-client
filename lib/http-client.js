const fetch = require('node-fetch');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

function responseError(errorCode, data) {
  const error = new Error();
  error.response = { status: errorCode, data };
  logRequestError(error);
  return error;
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
   */
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl;
  }

  set bearerToken(token) {
    const header = `Bearer ${token}`;
    this.authHeader = { authorization: header };
  }

  async request(httpVerb, url, headers, body) {
    logRequestInfo(httpVerb, url, headers);
    let errorCode;
    const options = {
      headers: this.mergeHeaders(headers),
      method: httpVerb,
      body: JSON.stringify(body),
    };
    const data = await fetch(this.expandUrl(url), options)
      .then((response) => {
        if (!response.ok) { errorCode = response.status; }
        return response.json();
      });
    logResponseInfo(data);
    if (errorCode) { throw responseError(errorCode, data); }
    return data;
  }

  async get(url, headers) {
    return this.request('get', url, headers);
  }

  async delete(url, headers) {
    return this.request('delete', url, headers);
  }

  async put(url, body, headers) {
    return this.request('put', url, headers, body);
  }

  async post(url, body, headers) {
    return this.request('post', url, headers, body);
  }

  async patch(url, body, headers) {
    return this.request('patch', url, headers.headers, body);
  }

  expandUrl(url) {
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

  mergeHeaders(customHeaders) {
    return Object.assign({}, defaultHeaders, this.authHeader, this.acceptHeader, customHeaders);
  }
};
