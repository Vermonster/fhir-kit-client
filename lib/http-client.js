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
          const response = await this.axiosInstance[httpVerb](url.toString(), ...rest);
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
   * @return {URL}
   */
  get baseUrl() {
    return this.axiosInstance.defaults.baseURL;
  }

  /**
   * Set the baseUrl value to a URL Object.
   *
   * @param {string|object<URL>} string-version of the Url.
   * @return {object<URL>} value as a URL object
   */
  set baseUrl(url) {
    this.axiosInstance.defaults.baseURL = url.toString();
    return this.axiosInstance.defaults.baseURL;
  }
}

module.exports = HttpClient;
