const { URLSearchParams } = require('url');
const { authFromCapability } = require('./smart');
const HttpClient = require('./http-client');

/** Class for a FHIR client. */
class Client {
  /**
   * Create a FHIR client.
   *
   * @param {object} config Client configuration
   * @param.baseUrl {string} ISS for FHIR server
   */
  constructor(config) {
    this.httpClient = new HttpClient({ baseUrl: config.baseUrl });
    this.baseUrl = config.baseUrl;
  }

  /**
   * Get the baseUrl value.
   *
   * @return {URL}
   */
  get baseUrl() {
    return this.httpClient.baseUrl;
  }

  /**
   * Set the baseUrl value to a URL Object.
   *
   * @param {string|object<URL>} string-version of the Url.
   * @return {object<URL>} value as a URL object
   */
  set baseUrl(url) {
    this.httpClient.baseUrl = url;
  }

  setBearerToken(token) {
    this.httpClient.axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
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
    return this.httpClient.get('metadata');
  }

  /**
   * Get a resource by FHIR id.
   *
   * @example
   *
   * // Using promises
   * fhirClient.read({ resourceType: 'Patient', id: 12345 })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.read({ resourceType: 'Patient', id: 12345 });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.id - The FHIR id for the resource.
   *
   * @return {Promise<Object>} FHIR resource
   */
  read(params) {
    return this.httpClient.get(`${params.resourceType}/${params.id}`);
  }

  /**
   * Get a resource by id and version.
   *
   * @example
   *
   * // Using promises
   * fhirClient.vread({ resourceType: 'Patient', id: '12345',
   *                    version: '1' })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.vread({ resourceType: 'Patient',
   *                                         id: '12345', version: '1' });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   *  @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.id - The FHIR id for the resource.
   * @param {string} params.version - The version id for the resource.
   *
   * @return {Promise<Object>} FHIR resource
   */
  vread(params) {
    return this.httpClient.get(`${params.resourceType}/${params.id}/_history/${params.version}`);
  }

  /**
   * Search for FHIR resources.
   *
   * @example
   *
   * // Using promises
   * fhirClient.search({ resourceType: 'Patient',
   *                     searchParams: { name: 'smith' } })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.search({ resourceType: 'Patient',
   *                                          searchParams: { name: 'smith' } });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {Object} params.searchParams - The search parameters.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  search(params) {
    const relativePathWithQuery = `${params.resourceType}?${new URLSearchParams(params.searchParams)}`;
    return this.httpClient.get(relativePathWithQuery);
  }
}

module.exports = { Client };
