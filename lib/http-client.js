const axios = require('axios');
const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

const paramCount = {
  delete: 1,
  get: 1,
  patch: 2,
  post: 2,
  put: 2,
};

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
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
    });
    this.baseUrl = baseUrl;

    // Dynamically-assigned instance methods for HTTP verbs:
    ['get', 'post', 'patch', 'put', 'delete'].forEach((httpVerb) => {
      this[httpVerb] = async (url, ...rest) => {
        try {
          const response = await this.request(httpVerb, url, ...rest);
          logResponseInfo(response);
          return response.data;
        } catch (error) {
          logRequestError(error);
          throw error;
        }
      };
    });
  }

  defaultHeaders() {
    const headers = { Accept: 'application/json+fhir' };
    if (this.authorizationHeader) headers.Authorization = this.authorizationHeader;
    return headers;
  }

  async request(httpVerb, url, ...rest) {
    const params = this.assignDefaultHeaders(httpVerb, rest);
    logRequestInfo(httpVerb, url, axios, params[params.length - 1]);
    return this.axiosInstance[httpVerb](url, ...params);
  }

  assignDefaultHeaders(httpVerb, params = []) {
    // axios calls look like:
    // - delete/get(url, optionalConfig)
    // - patch/post/put(url, optionalBody, optionalConfig)
    const configIndex = paramCount[httpVerb] - 1;
    const currentConfig = params[configIndex] || {};
    const newHeaders = Object.assign({}, this.defaultHeaders(), currentConfig.headers);
    const newConfig = Object.assign({}, currentConfig, { headers: newHeaders });
    const newParams = [...params];
    newParams[configIndex] = newConfig;
    return newParams;
  }
};
