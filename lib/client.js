const { URL, URLSearchParams } = require('url');
const axios = require('axios');
const { authFromCapability } = require('./smart');
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

/** Class for a FHIR client. */
class Client {
  /**
   * Create a FHIR client.
   *
   * @param {object} config Client configuration
   * @param.baseUrl {string} ISS for FHIR server
   */
  constructor(config) {
    this.baseUrl = config.baseUrl;
  }

  /**
   * Get the baseUrl value.
   *
   * @return {URL}
   */
  get baseUrl() {
    return this._baseUrl;
  }

  /**
   * Set the baseUrl value to a URL Object.
   *
   * @param {string|object<URL>} string-version of the Url.
   * @return {object<URL>} value as a URL object
   */
  set baseUrl(url) {
    if (url instanceof URL) {
      this._baseUrl = url;
    } else {
      this._baseUrl = new URL(url);
    }
    return this._baseUrl;
  }

  /**
   * Create a new URL object with an appended path.
   *
   * @private
   *
   * @param {string} path The path to append to the current baseUrl
   *
   * @return {URL} New URL object with path
   */
  buildUrl(path) {
    const url = new URL(this.baseUrl);
    url.pathname += url.pathname.slice(-1) === '/' ? path : `/${path}`;
    return url;
  }

  /**
   * Obtain the SMART OAuth URLs from the Capability Statement
   *
   * @async
   *
   * @example
   *
   * // Using promises
   * fhirClient.smartAuthMetadata().then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.smartAuthMetadata();
   * console.log(response);
   *
   * @return {Promise<Object>} Structure of urls for OAuth
   */
  async smartAuthMetadata() {
    const capabilityStatement = await this.capabilityStatement();

    return authFromCapability(capabilityStatement);
  }

  /**
   * Get the capability statement.
   *
   * @async
   *
   * @example
   *
   * // Using promises
   * fhirClient.capabilityStatement().then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.capabilityStatement();
   * console.log(response);
   *
   * @return {Promise<Object>} capability statement FHIR resource.
   */
  capabilityStatement() {
    const url = this.buildUrl('metadata');
    return httpGet(url);
  }

  /**
   * Get a resource by identifier.
   *
   * @example
   *
   * // Using promises
   * fhirClient.read({ resourceType: 'Patient', identifier: 12345 })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.read({ resourceType: 'Patient', identifier: 12345 });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.identifier - The FHIR identifier for the resource.
   *
   * @return {Promise<Object>} FHIR resource
   */
  read(params) {
    const url = this.buildUrl(`${params.resourceType}/${params.identifier}`);
    return httpGet(url);
  }

  /**
   * Get a resource by identifier and version.
   *
   * @example
   *
   * // Using promises
   * fhirClient.vread({ resourceType: 'Patient', identifier: '12345',
   *                    version: '1' })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.vread({ resourceType: 'Patient',
   *                                         identifier: '12345', version: '1' });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
  *  @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.identifier - The FHIR identifier for the resource.
   * @param {string} params.version - The version identifier for the resource.
   *
   * @return {Promise<Object>} FHIR resource
   */
  vread(params) {
    const url = this.buildUrl(`${params.resourceType}/${params.identifier}/_history/${params.version}`);
    return httpGet(url);
  }

  /**
   * Search for FHIR resources.
   *
   * @example
   *
   * // Using promises
   * fhirClient.search({ resourceType: 'Patient', identifier: 12345,
   *                     searchParams: { name: 'smith' } })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.search({ resourceType: 'Patient',
   *                                          identifier: 12345, searchParams: { name: 'smith' } });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {Object} params.searchParams - The search parameters.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  search(params) {
    const _params = new URLSearchParams(params.searchParams);
    const url = this.buildUrl(params.resourceType);
    url.search = _params;
    return httpGet(url);
  }
}

module.exports = { Client };
