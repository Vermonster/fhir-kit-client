const queryString = require('query-string');
const { authFromCapability } = require('./smart');
const HttpClient = require('./http-client');
const ReferenceResolver = require('./reference-resolver');
const Pagination = require('./pagination');

const deprecateHeaders = (options, headers) => {
  if (headers) {
    console.warn('WARNING: headers is deprecated and will be removed in the next major version. Use options.headers instead.');
    options.headers = headers;
  }
};

/**
 * @module fhir-kit-client
 */
class Client {
  /**
   * Create a FHIR client.
   *
   * @param {Object} config Client configuration
   * @param {String} config.baseUrl ISS for FHIR server
   * @param {Object} config.customHeaders Optional custom headers to send with
   *   each request
   * @throws An error will be thrown unless baseUrl is a non-empty string.
   */
  constructor({ baseUrl, customHeaders } = {}) {
    this.httpClient = new HttpClient({ baseUrl, customHeaders });
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
    return this.httpClient.baseUrl;
  }

  /**
   * Set the baseUrl.
   *
   * @param {String} url - Set the baseUrl
   * @throws An error will be thrown unless baseUrl is a non-empty string.
   */
  set baseUrl(url) {
    if (!url) {
      throw new Error('baseUrl cannot be blank');
    }
    if (typeof url !== 'string') {
      throw new Error('baseUrl must be a string');
    }

    this.httpClient.baseURL = url;
  }

  /**
   * Get custom headers.
   *
   * @return {Object} - Get the custom headers
   */
  get customHeaders() {
    return this.httpClient.customHeaders;
  }

  /**
   * Set custom headers.
   *
   * @param {Object} headers - Set custom headers to be sent with each request
   */
  set customHeaders(headers) {
    this.httpClient.customHeaders = headers;
  }

  /**
   * Set the Authorization header to "Bearer ${token}".
   *
   * @param {String} token The access token value.
   */
  set bearerToken(token) {
    this.httpClient.bearerToken = token;
  }

  /**
   * Resolve a reference and return FHIR resource
   *
   * From: http://hl7.org/fhir/STU3/references.html, a reference can be: 1)
   * absolute URL, 2) relative URL or 3) an internal fragement. In the case of
   * (2), there are rules on resolving references that are in a FHIR bundle.
   *
   * @async
   *
   * @example
   *
   * // Always does a new http request
   * client.resolve({ reference: 'http://test.com/fhir/Patient/1' }).then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Always does a new http request, using the client.baseUrl
   * client.resolve({ reference: 'Patient/1' }).then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Try to resolve a patient in the bundle, otherwise build request
   * // at client.baseUrl
   * client.resolve({ reference: 'Patient/1', context: bundle }).then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Resolve a patient contained in someResource (see:
   * // http://hl7.org/fhir/STU3/references.html#contained)
   * client.resolve({ reference: '#patient-1', context: someResource }).then((patient) => {
   *   console.log(patient);
   * });
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.reference - FHIR reference
   * @param {Object} [params.context] - Optional bundle or FHIR resource
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  resolve({ reference, context, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.resolver.resolve({ reference, context, options });
  }

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
   * @param {Object} [params] - The request parameters.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} contains the following SMART URIs: authorizeUrl,
   *   tokenUrl, registerUrl, manageUrl
   */
  async smartAuthMetadata({ headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    const capabilityStatement = await this.capabilityStatement({ options });

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
   * @param {Object} [params] - The request parameters.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} capability statement FHIR resource.
   */
  capabilityStatement({ headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    if (!this.metadata) {
      this.metadata = this.httpClient.get('metadata', options.headers);
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
   * @param {String} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  read({ resourceType, id, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.get(`${resourceType}/${id}`, options.headers);
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
   * @param {String} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   * @param {String} params.version - The version id for the resource.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  vread({ resourceType, id, version, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.get(`${resourceType}/${id}/_history/${version}`, options.headers);
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
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  create({ resourceType, body, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.post(resourceType, body, options.headers);
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
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} Operation Outcome FHIR resource
   */
  delete({ resourceType, id, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.delete(`${resourceType}/${id}`, options.headers);
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
   * @param {String} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   * @param {String} params.body - The resource to be updated.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  update({ resourceType, id, body, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.put(`${resourceType}/${id}`, body, options.headers);
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
   * @param {String} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   * @param {Array} params.JSONpatch - A JSON Patch document containing an array
   *   of patch operations, formatted according to http://jsonpatch.com/.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  patch({ resourceType, id, JSONPatch, headers, options = {} } = {}) {
    // Content-Type is 'application/json-patch+json'
    // Ref: http://hl7.org/fhir/STU3/http.html#patch
    deprecateHeaders(options, headers);
    const customHeaders = options.headers || {};
    const requestHeaders = { ...customHeaders, 'Content-Type': 'application/json-patch+json' };
    return this.httpClient.patch(`${resourceType}/${id}`, JSONPatch, { headers: requestHeaders });
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
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  batch({ body, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.post('/', body, options.headers);
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
   * @param {String} params.body - The request body with a type of
   *   'transaction'.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  transaction({ body, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.post('/', body, options.headers);
  }

  /**
   * Return the next page of results.
   *
   * @param {object} results - Bundle result of a FHIR search
   * @param {Object} [headers] - Optional custom headers to add to the request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  nextPage(results, headers, options = {}) {
    deprecateHeaders(options, headers);
    return this.pagination.nextPage(results, options.headers);
  }

  /**
   * Return the previous page of results.
   *
   * @param {object} results - Bundle result of a FHIR search
   * @param {Object} [headers] - Optional custom headers to add to the request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  prevPage(results, headers, options = {}) {
    deprecateHeaders(options, headers);
    return this.pagination.prevPage(results, options.headers);
  }

  /**
   * Search for a FHIR resource, with or without compartments, or the entire
   * system
   *
   * @example
   *
   * // Using promises
   * fhirClient.search({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc', _include: ['Observation:encounter', 'Observation:performer'] },
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.search({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc', _include: ['Observation:encounter', 'Observation:performer'] },
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} [params.resourceType] - The resource type
   *   (e.g. "Patient", "Observation"), optional.
   * @param {Object} [params.compartment] - The search compartment, optional.
   * @param {Object} [params.searchParams] - The search parameters, optional.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   *
   * @throws {Error} if neither searchParams nor resourceType are supplied
   */
  search({ resourceType, compartment, searchParams, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    if (compartment && resourceType) {
      return this.compartmentSearch({ resourceType, compartment, searchParams, options });
    } else if (resourceType) {
      return this.resourceSearch({ resourceType, searchParams, options });
    } else if (searchParams instanceof Object && Object.keys(searchParams).length > 0) {
      return this.systemSearch({ searchParams, options });
    }

    throw new Error('search requires either searchParams or a resourceType');
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
   * @param {String} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {Object} params.searchParams - The search parameters.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  resourceSearch({ resourceType, searchParams, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    let searchPath = resourceType;
    if (searchParams instanceof Object && Object.keys(searchParams).length > 0) {
      searchPath += `?${queryString.stringify(searchParams)}`;
    }

    return this.httpClient.get(searchPath, options.headers);
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
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  systemSearch({ searchParams, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.get(`/_search?${queryString.stringify(searchParams)}`, options.headers);
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
   * @param {String} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {Object} params.compartment - The search compartment.
   * @param {Object} [params.searchParams] - The search parameters, optional.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  compartmentSearch({ resourceType, compartment, searchParams, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    let compartmentType;
    let compartmentId;
    try {
      compartmentType = compartment.resourceType;
      compartmentId = compartment.id;
    } catch (error) {
      throw error;
    }

    const relativePath = `/${compartmentType}/${compartmentId}/${resourceType}`;
    const relativePathWithQuery = searchParams ? `${relativePath}?${queryString.stringify(searchParams)}` : relativePath;

    return this.httpClient.get(relativePathWithQuery, options.headers);
  }

  /**
   * Retrieve the change history for a FHIR resource id, a resource type or the
   * entire system
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
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  history({ resourceType, id, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    if (id && resourceType) {
      return this.resourceHistory({ resourceType, id, options });
    } else if (resourceType) {
      return this.typeHistory({ resourceType, options });
    }

    return this.systemHistory({ options });
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
   * @param {string} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {string} params.id - The FHIR id for the resource.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  resourceHistory({ resourceType, id, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.get(`${resourceType}/${id}/_history`, options.headers);
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
   * @param {string} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  typeHistory({ resourceType, headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.get(`${resourceType}/_history`, options.headers);
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
   * @param {Object} [params] - The request parameters.
   * @param {Object} [params.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  systemHistory({ headers, options = {} } = {}) {
    deprecateHeaders(options, headers);
    return this.httpClient.get('_history', options.headers);
  }
}

module.exports = Client;
