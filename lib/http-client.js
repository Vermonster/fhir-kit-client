const axios = require('axios');
const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

/** Class for an HTTP client. */
class HttpClient {
  /**
   * Create an HTTP client.
   *
   * @param {Object} config HTTP Client configuration
   * @param {string} config.baseUrl Base URL that axios uses to resolve relative paths
   */
  constructor({ baseUrl }) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
    });

    this.axiosInstance.defaults.headers.common.Accept = 'application/json+fhir';

    // Dynamically-assigned instance methods for HTTP verbs:
    ['get', 'post', 'patch', 'put', 'delete'].forEach((httpVerb) => {
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
}

module.exports = HttpClient;
