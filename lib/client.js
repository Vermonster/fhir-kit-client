const { URLSearchParams } = require('url');
const { authFromCapability } = require('./smart');
const HttpClient = require('./http-client');
const ReferenceResolver = require('./reference-resolver');
const Pagination = require('./pagination');

/**
 * @module fhir-kit-client
 */
class Client {
  /**
   * Create a FHIR client.
   *
   * @param {Object} config Client configuration
   * @param {String} config.baseUrl ISS for FHIR server
   */
  constructor({ baseUrl } = {}) {
    this.httpClient = new HttpClient({ baseUrl });
    this.baseUrl = baseUrl;
    this.resolver = new ReferenceResolver(this);
    this.pagination = new Pagination(this.httpClient);
  }

  /**
   * Get the baseUrl.
   *
   * @return {String} - Get the baseUrl
   */
  get baseUrl() {
    return this.httpClient.axiosInstance.baseURL;
  }

  /**
   * Set the baseUrl.
   *
   * @param {String} url - Set the baseUrl
   */
  set baseUrl(url) {
    this.httpClient.axiosInstance.baseURL = url;
  }

  /**
   * Set the axios Authorization header to "Bearer ${token}".
   *
   * @param {String} token The access token value.
   */
  set bearerToken(token) {
    this.httpClient.authorizationHeader = `Bearer ${token}`;
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
    if (!this.metadata) {
      this.metadata = this.httpClient.get('metadata');
    }
    return this.metadata;
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
  read({ resourceType, id } = {}) {
    return this.httpClient.get(`${resourceType}/${id}`);
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
  vread({ resourceType, id, version } = {}) {
    return this.httpClient.get(`${resourceType}/${id}/_history/${version}`);
  }

  /**
   * Create a resource.
   *
   * @example
   * const newPatient = {
   *   resourceType: 'Patient',
   *   active: true,
   *   name: [{ use: 'official', family: ['Coleman'], given: ['Lisa', 'P.'] }],
   *   gender: 'female',
   *   birthDate: '1948-04-14',
   * }
   *
   * // Using promises
   * fhirClient.create({
   *   resourceType: 'Patient',
   *   body: newPatient,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.create({
   *   resourceType: 'Patient',
   *   body: newPatient,
   * })
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The FHIR resource type.
   * @param {String} params.body - The new resource data to create.
   *
   * @return {Promise<Object>} FHIR resource
   */
  create({ resourceType, body } = {}) {
    return this.httpClient.post(resourceType, body);
  }

  /**
   * Delete a resource by FHIR id.
   *
   * @example
   *
   * // Using promises
   * fhirClient.delete({
   *   resourceType: 'Patient',
   *   id: 12345,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.delete({ resourceType: 'Patient', id: 12345 });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   *
   * @return {Promise<Object>} Operation Outcome FHIR resource
   */
  delete({ resourceType, id } = {}) {
    return this.httpClient.delete(`${resourceType}/${id}`);
  }

  /**
   * Update a resource by FHIR id.
   *
   * @example
   *
   * const updatedPatient = {
   *   resourceType: 'Patient',
   *   birthDate: '1948-04-14',
   * }
   *
   * // Using promises
   * fhirClient.update({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   body: updatedPatient,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.update({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   body: updatedPatient,
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   * @param {String} params.body - The resource to be updated.
   *
   * @return {Promise<Object>} FHIR resource
   */
  update({ resourceType, id, body } = {}) {
    return this.httpClient.put(`${resourceType}/${id}`, body);
  }

  /**
   * Patch a resource by FHIR id.
   *
   * From http://hl7.org/fhir/STU3/http.html#patch:
   * Content-Type is 'application/json-patch+json'
   * Expects a JSON Patch document format, see http://jsonpatch.com/
   *
   * @example
   *
   * // JSON Patch document format from http://jsonpatch.com/
   * const JSONPatch = [{ op: 'replace', path: '/gender', value: 'male' }];
   *
   * // Using promises
   * fhirClient.patch({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   JSONpatch: JSONPatch,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.patch({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   JSONPatch: JSONPatch
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   * @param {Array} params.JSONpatch - A JSON Patch document containing an array of patch operations, formatted according to http://jsonpatch.com/.
   *
   * @return {Promise<Object>} FHIR resource
   */
  patch({ resourceType, id, JSONPatch } = {}) {
    // Content-Type is 'application/json-patch+json'
    // Ref: http://hl7.org/fhir/STU3/http.html#patch
    const headers = { 'Content-Type': 'application/json-patch+json' };
    return this.httpClient.patch(`${resourceType}/${id}`, JSONPatch, { headers });
  }

  /**
   * Submit a set of actions to perform independently as a batch.
   *
   * Update, create or delete a set of resources in a single interaction.
   * There should be no interdependencies between entries in the bundle.
   *
   * @example
   *
   * const requestBundle = {
   *   'resourceType': 'Bundle',
   *   'type': 'batch',
   *   'entry': [
   *    {
   *      'fullUrl': 'http://example.org/fhir/Patient/123',
   *      'resource': {
   *        'resourceType': 'Patient',
   *        'id': '123',
   *        'active': true
   *      },
   *      'request': {
   *        'method': 'PUT',
   *        'url': 'Patient/123'
   *      }
   *    },
   *     {
   *       'request': {
   *         'method': 'DELETE',
   *         'url': 'Patient/2e27c71e-30c8-4ceb-8c1c-5641e066c0a4'
   *       }
   *     },
   *     {
   *       'request': {
   *         'method': 'GET',
   *         'url': 'Patient?name=peter'
   *       }
   *     }
   *   ]
   * }
   *
   * // Using promises
   * fhirClient.batch({
   *   body: requestBundle
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.batch({
   *   body: requestBundle
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.body - The request body with a type of 'batch'.
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  batch({ body } = {}) {
    return this.httpClient.post('/', body);
  }

  /**
   * Submit a set of actions to perform independently as a transaction.
   *
   * Update, create or delete a set of resources in a single interaction.
   * The entire set of changes should succeed or fail as a single entity.
   * Multiple actions on multiple resources different types may be submitted.
   * The outcome should not depend on the order of the resources loaded.
   * Order of processing actions: DELETE, POST, PUT, and GET.
   * The transaction fails if any resource overlap in DELETE, POST and PUT.
   *
   * @example
   *
   * const requestBundle = {
   *   'resourceType': 'Bundle',
   *   'type': 'transaction',
   *   'entry': [
   *    {
   *      'fullUrl': 'http://example.org/fhir/Patient/123',
   *      'resource': {
   *        'resourceType': 'Patient',
   *        'id': '123',
   *        'active': true
   *      },
   *      'request': {
   *        'method': 'PUT',
   *        'url': 'Patient/123'
   *      }
   *    },
   *     {
   *       'request': {
   *         'method': 'DELETE',
   *         'url': 'Patient/2e27c71e-30c8-4ceb-8c1c-5641e066c0a4'
   *       }
   *     },
   *     {
   *       'request': {
   *         'method': 'GET',
   *         'url': 'Patient?name=peter'
   *       }
   *     }
   *   ]
   * }
   *
   * // Using promises
   * fhirClient.transaction({
   *   body: requestBundle
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.transaction({
   *   body: requestBundle
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.body - The request body with a type of 'transaction'.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  transaction({ body } = {}) {
    return this.httpClient.post('/', body);
  }

  /**
   * Return the next page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  nextPage(results) {
    return this.pagination.nextPage(results);
  }

  /**
   * Return the previous page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  prevPage(results) {
    return this.pagination.prevPage(results);
  }

  /**
   * Search for a FHIR resource, with or without compartments, or the entire system
   *
   * @example
   *
   * // Using promises
   * fhirClient.search({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc' },
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.search({
   *   resourceType: 'Patient',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc' },
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} [params.resourceType] - The resource type
   *   (e.g. "Patient", "Observation"), optional.
   * @param {Object} [params.compartment] - The search compartment, optional.
   * @param {Object} [params.searchParams] - The search parameters, optional.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  search({ resourceType, compartment, searchParams } = {}) {
    if (compartment && resourceType) {
      return this.compartmentSearch({ resourceType, compartment, searchParams });
    } else if (resourceType && searchParams) {
      return this.resourceSearch({ resourceType, searchParams });
    } else if (searchParams) {
      return this.systemSearch({ searchParams });
    }
  }

  /**
   * Search for a FHIR resource.
   *
   * @example
   *
   * // Using promises
   * fhirClient.resourceSearch({
   *   resourceType: 'Patient',
   *   searchParams: { name: 'Smith' },
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.resourceSearch({
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
  resourceSearch({ resourceType, searchParams } = {}) {
    const relativePathWithQuery = `${resourceType}?${new URLSearchParams(searchParams)}`;
    return this.httpClient.get(relativePathWithQuery);
  }

  /**
   * Search across all FHIR resource types in the system.
   * Only the parameters defined for all resources can be used.
   *
   * @example
   *
   * // Using promises
   * fhirClient.systemSearch({
   *   searchParams: { name: 'smith' }
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.systemSearch({ searchParams: { name: 'smith' } });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {Object} params.searchParams - The search parameters.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  systemSearch({ searchParams } = {}) {
    return this.httpClient.get(`/_search?${new URLSearchParams(searchParams)}`);
  }

  /**
   * Search for FHIR resources within a compartment.
   * The resourceType and id must be specified.
   *
   * @example
   *
   * // Using promises
   * fhirClient.compartmentSearch({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc' }
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.compartmentSearch({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc' }
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {Object} params.compartment - The search compartment.
   * @param {Object} [params.searchParams] - The search parameters, optional.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  compartmentSearch({ resourceType, compartment, searchParams } = {}) {
    let compartmentType;
    let compartmentId;
    try {
      compartmentType = compartment.resourceType;
      compartmentId = compartment.id;
    } catch (error) {
      throw error;
    }

    const relativePath = `/${compartmentType}/${compartmentId}/${resourceType}`;
    const relativePathWithQuery = searchParams ? `${relativePath}?${new URLSearchParams(searchParams)}` : relativePath;

    return this.httpClient.get(relativePathWithQuery);
  }

  /**
   * Retrieve the change history for a FHIR resource id, a resource type or the entire system
   *
   * @example
   *
   * // Using promises
   * fhirClient.history({ resourceType: 'Patient', id: '12345' });
   *   .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.history({ resourceType: 'Patient', id: '12345' });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} [params.resourceType] - The resource type
   *   (e.g. "Patient", "Observation"), optional.
   * @param {string} [params.id] - The FHIR id for the resource, optional.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  history({ resourceType, id } = {}) {
    if (id && resourceType) {
      return this.resourceHistory({ resourceType, id });
    } else if (resourceType) {
      return this.typeHistory({ resourceType });
    }

    return this.systemHistory();
  }
  /**
   * Retrieve the change history for a particular resource FHIR id.
   *
   * @example
   *
   * // Using promises
   * fhirClient.resourceHistory({ resourceType: 'Patient', id: '12345' });
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.resourceHistory({ resourceType: 'Patient', id: '12345' });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param {string} params.id - The FHIR id for the resource.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  resourceHistory({ resourceType, id } = {}) {
    return this.httpClient.get(`${resourceType}/${id}/_history`);
  }

  /**
   * Retrieve the change history for a particular resource type.
   *
   * @example
   *
   * // Using promises
   * fhirClient.typeHistory({ resourceType: 'Patient' });
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.typeHistory({ resourceType: 'Patient' });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  typeHistory({ resourceType } = {}) {
    return this.httpClient.get(`${resourceType}/_history`);
  }

  /**
   * Retrieve the change history for all resources.
   *
   * @example
   *
   * // Using promises
   * fhirClient.systemHistory();
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.systemHistory();
   * console.log(response);
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  systemHistory() {
    return this.httpClient.get('_history');
  }
}

module.exports = Client;
