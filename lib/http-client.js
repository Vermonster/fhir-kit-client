const axios = require('axios');
const { logRequestError, logRequestInfo, logResponseInfo } = require('./logging');

/**
 * Private function for Client to use for http requests
 *
 * @private
 *
 * @return {object} response from server parsed as JSON
 */
async function httpGet(url) {
  try {
    axios.defaults.headers.common.Accept = 'application/json+fhir';
    logRequestInfo('get', url, axios);
    const response = await axios.get(url.toString());
    const { data } = response;
    logResponseInfo(response);
    return data;
  } catch (error) {
    logRequestError(error);
    throw error;
  }
}

/** Class for a HTTP-client. */
class HttpClient {
  constructor() {
    this.axiosInstance = axios.create({
      // baseURL: 'https://api.example.com'
    });

    this.axiosInstance.defaults.headers.common.Accept = 'application/json+fhir';

    // Dynamically-assigned instance methods for HTTP verbs:
    ['get', 'post', 'patch', 'put', 'delete'].forEach((httpVerb) => {
      this[httpVerb] = async (url, ...rest) => {
        const response = await this.axiosInstance[httpVerb](url.toString(), ...rest);
        return response.data;
      };
    });
  }
}

module.exports = HttpClient;
