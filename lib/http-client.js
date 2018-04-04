const axios = require('axios');
const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

/** Class for a HTTP-client. */
class HttpClient {
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

  /**
   * Get the baseUrl value.
   *
   * @return {string}
   */
  get baseUrl() {
    return this.axiosInstance.defaults.baseURL;
  }

  /**
   * Set the baseUrl value to a URL Object.
   *
   * @param {string} url string-version of the base-URL.
   */
  set baseUrl(url) {
    this.axiosInstance.defaults.baseURL = url;
  }
}

module.exports = HttpClient;
