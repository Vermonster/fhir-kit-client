require('es6-promise').polyfill();
const request = require('request-promise-native');

const Client = require('./client');

const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

/*
function OK(){}
OK.prototype.toString = function () { return JSON.stringify(this.body); };
//OK.prototype.valueOf = function () { console.log('OK valueOf'); return this.body; };

function responseOk(
  headers,
  status,
  body
) {
  const r = new OK();
  r.headers = headers;
  r.status = status;
  r.body = false;
  if (body) {r.body = JSON.parse(body);}
  r.location = false;
  if (headers.location) {r.location = headers.location; }
  return r;
}
*/
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
    console.log('FHIR Client using certs');
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

    if (this.cert) {
      requestParams.key = this.key;
      requestParams.cert = this.cert;
    }

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

        assignProperty(r,response.headers, Client.Headers);
        assignProperty(r,response.statusCode, Client.StatusCode);
        if (response.headers.location) {
          assignProperty(r,response.location, Client.Location);
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
