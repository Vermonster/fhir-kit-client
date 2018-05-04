const axios = require('axios');
const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

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
          logRequestInfo(httpVerb, url, axios);
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

  async request(httpVerb, url, ...rest)  {
    const params = Array.from(rest || []);
    // Configuration options are always the last param when they are present
    const configIndex = params.length - 1;

    // axios calls look like:
    // - httpVerb(url, optionalConfig)
    // - httpVerb(url, optionalBody, optionalConfig)
    // If we didn't receive any optional arguments, then we can just add the
    // headers as the last argument.
    // If we did receive an optional argument, we need to determine whether it
    // is a request body or configuration. The only configuration argument we
    // use is headers, which is not a FHIR field, so if the last optional
    // argument contains a headers field, it is a configuration and not a body.
    // If it is a configuration object, we need to merge the headers.
    // If it's a body, we can add the headers as the last object.
    if (params.length > 0 && params[configIndex].headers) {
      const newHeaders = Object.assign({}, this.defaultHeaders(), params[configIndex].headers);
      params[configIndex] = Object.assign({}, params[configIndex], { headers: newHeaders });
    } else {
      params.push({ headers: this.defaultHeaders() });
    }
    return await this.axiosInstance[httpVerb](url, ...params);
  }
};
