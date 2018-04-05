const { URLSearchParams } = require('url');
const { authFromCapability } = require('./smart');
const HttpClient = require('./http-client');
const ReferenceResolver = require('./reference-resolver');

/** Class for a FHIR client. */
class Client {
  /**
   * Create a FHIR client.
   *
   * @param {Object} config Client configuration
   * @param {String} config.baseUrl ISS for FHIR server
   */
  constructor(config) {
    this.httpClient = new HttpClient({ baseUrl: config.baseUrl });
    this.baseUrl = config.baseUrl;
    this.resolver = new ReferenceResolver(this);
  }

  /**
   * Get the baseUrl.
   *
   * @return {String} - Get the baseUrl
   */
  get baseUrl() {
    return this.httpClient.axiosInstance.defaults.baseURL;
  }

  /**
   * Set the baseUrl.
   *
   * @param {String} url - Set the baseUrl
   */
  set baseUrl(url) {
    this.httpClient.axiosInstance.defaults.baseURL = url;
  }

  /**
   * Set the axios Authorization header to "Bearer ${token}".
   *
   * @param {String} token The access token value.
   */
  set bearerToken(token) {
    this.httpClient.axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  /**
   * Resolve a reference and return FHIR resource
   *
   * From: http://hl7.org/fhir/STU3/references.html, a reference can be: 1)
   * absolute URL, 2) relative URL or 3) an internal fragement.  In the case of
   * (2), there are rules on resolving references that are in a FHIR bundle.
   *
   * @async
   *
   * @example
   *
   * // Always does a new http request
   * client.resolve('http://test.com/fhir/Patient/1'.then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Always does a new http request, using the client.baseUrl
   * client.resolve('Patient/1'.then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Try to resolve a patient in the bundle, otherwise build request
   * // at client.baseUrl
   * client.resolve('Patient/1' bundle).then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Resolve a patient contained in someResource (see:
   * // http://hl7.org/fhir/STU3/references.html#contained)
   * client.resolve('#patient-1' someResource).then((patient) => {
   *   console.log(patient);
   * });
   *
   * @param {String} reference the FHIR reference
   * @param {Object} [context] bundle or FHIR resource, optional
   *
   * @return {Promise<Object>} FHIR resource
   */
  resolve(reference, context) { return this.resolver.resolve(reference, context); }

  /**
   * Obtain the SMART OAuth URLs from the Capability Statement
   * http://docs.smarthealthit.org/authorization/conformance-statement/
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
   * @return {Promise<Object>} contains the following SMART URIs: authorizeUrl,
   *   tokenUrl, registerUrl, manageUrl
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
   * fhirClient.read({
   *   resourceType: 'Patient',
   *   id: 12345,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.read({ resourceType: 'Patient', id: 12345 });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {String} params.id - The FHIR id for the resource.
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
   * fhirClient.vread({
   *   resourceType: 'Patient',
   *   id: '12345',
   *   version: '1',
   * }).then(data => console.log(data));
   *
   * // Using async
   * let response = await fhirClient.vread({
   *   resourceType: 'Patient',
   *   id: '12345',
   *   version: '1',
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   * @param {String} params.version - The version id for the resource.
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
   * fhirClient.search({
   *   resourceType: 'Patient',
   *   searchParams: { name: 'Smith' },
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.search({
   *   resourceType: 'Patient',
   *   searchParams: { name: 'Smith' },
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {Object} params.searchParams - The search parameters.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  search(params) {
    const relativePathWithQuery = `${params.resourceType}?${new URLSearchParams(params.searchParams)}`;
    return this.httpClient.get(relativePathWithQuery);
  }

  /**
   * Create a resource by FHIR id.
   *
   * @example
   * const newPatient = { resourceType: 'Patient',
   *                      active: true,
   *                      name: [{ use: 'official', family: ['Coleman'], given: ['Lisa', 'P.'] }],
   *                      gender: 'female',
   *                      birthDate: '1948-04-14',
   *                    }
   *
   * // Using promises
   * fhirClient.create({ resourceType: 'Patient',
   *                     body: newPatient,
   *                   })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.create({ resourceType: 'Patient',
   *                                          body: newPatient,
   *                                         })
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.body - Information about the patient.
   *
   * @return {Promise<Object>} FHIR resource
   */
  create(params) {
    return this.httpClient.post(params.resourceType, params.body);
  }

  /**
   * Delete a resource by FHIR id.
   *
   * @example
   *
   * // Using promises
   * fhirClient.delete({ resourceType: 'Patient', id: 12345 })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.delete({ resourceType: 'Patient', id: 12345 });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.id - The FHIR id for the resource.
   *
   * @return {Promise<Object>} FHIR resource
   */
  delete(params) {
    return this.httpClient.delete(`${params.resourceType}/${params.id}`);
  }

  /**
   * Update a resource by FHIR id.
   *
   * @example
   *
   * const newPatient = { resourceType: 'Patient',
   *                      active: true,
   *                      name: [{ use: 'official', family: ['Coleman'], given: ['Lisa', 'P.'] }],
   *                      gender: 'female',
   *                      birthDate: '1948-04-14',
   *                    }
   *
   * // Using promises
   * fhirClient.update({ resourceType: 'Patient', id: 12345, body: newPatient })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.update({ resourceType: 'Patient', id: 12345, body: newPatient  });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.id - The FHIR id for the resource.
   * @param {string} params.body - Information about the patient.
   *
   * @return {Promise<Object>} FHIR resource
   */
  update(params) {
    return this.httpClient.put(`${params.resourceType}/${params.id}`, params.body);
  }

  /**
   * Patch a resource by FHIR id.
   *
   * @example
   *
   * // JSON Patch document format from http://jsonpatch.com/
   * const JSONpatch = { resourceType: 'Patient',
   *                     name: [{ use: 'official', family: ['Smith'], given: ['Lisa', 'P.'] }],
   *                   }
   *
   * // Using promises
   * fhirClient.patch({ resourceType: 'Patient', id: 12345, body: JSONpatch })
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.patch({ resourceType: 'Patient', id: 12345, body: JSONpatch });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.id - The FHIR id for the resource.
   * @param {string} params.body - A JSON Patch document, formatted according to http://jsonpatch.com/.
   *
   * @return {Promise<Object>} FHIR resource
   */
  patch(params) {
     // Content-Type is 'application/json-patch+json'
     // Ref: http://hl7.org/fhir/STU3/http.html#patch
    const headers = {'Content-Type': 'application/json-patch+json'};
    return this.httpClient.patch(`${params.resourceType}/${params.id}`, params.body, { headers });
  }
}

module.exports = Client;
