const fetch = require('node-fetch');
const axios = require('axios');
const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const defaultHeaders = { accept: 'application/json+fhir' };

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
   * @param {String} config.baseUrl Base URL that axios uses to resolve relative paths
   */
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl;
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
    });

    this.axiosInstance.defaults.headers.common.Accept = 'application/json+fhir';

    // Dynamically-assigned instance methods for HTTP verbs:
    ['post', 'patch', 'put'].forEach((httpVerb) => {
      this[httpVerb] = async (url, ...rest) => {
        try {
          logRequestInfo(httpVerb, url, axios);
          const response = await this.axiosInstance[httpVerb](url, ...rest);
          logResponseInfo(response);
          return response.data;
        } catch (error) {
          logRequestError(error);
          throw error;
        }
      };
    });
  }

  set bearerToken(token) {
    const header = `Bearer ${token}`;
    this.authHeader = { authorization: header };
    this.axiosInstance.defaults.headers.common.Authorization = header;
  }

  async requestWithoutBody(httpVerb, url, headers) {
    try {
      logRequestInfo(httpVerb, url, axios);
      let errorCode;
      const options = {
        headers: this.mergeHeaders(headers),
        method: httpVerb
      };
      const response = await fetch(this.expandUrl(url), options)
            .then(response => {
              if (!response.ok) {
                errorCode = response.status;
                debugger;
              }
              return response.json();
            });
      logResponseInfo(response);
      if (errorCode) {
        const error = new Error();
        error.response = {
          status: errorCode,
          data: response,
        };
        throw error;
      }
      return response;
    }  catch (error) {
      logRequestError(error);
      throw error;
    }
  }

  async get(url, headers) {
    return this.requestWithoutBody('get', url, headers);
  }

  async delete(url, headers) {
    return this.requestWithoutBody('delete', url, headers);
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
    return url.startsWith('http') ? url : this.baseUrl + '/' + url;
  }

  mergeHeaders(customHeaders) {
    return Object.assign({}, defaultHeaders, this.authHeader, customHeaders);
  }
};
