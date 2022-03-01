const queryString = require('query-string');
const { authFromCapability, authFromWellKnown } = require('./smart');
const HttpClient = require('./http-client');
const ReferenceResolver = require('./reference-resolver');
const Pagination = require('./pagination');
const { createQueryString, validResourceType } = require('./utils');
const { FetchQueue } = require('./fetch-queue');
const { deprecatePaginationArgs, deprecateHeaders } = require('./deprecations');
const CapabilityTool = require('./capability-tool');

/**
 * @module fhir-kit-client
 */
class Client {
  /**
   * Create a FHIR client.
   *
   * For details on what requestOptions are available, see the node `request`
   * documentation at https://github.com/request/request
   *
   * @example
   *
   * // minimial example
   * const client = new FhirKitClient({ url: 'http://baseurl/fhir' });
   *
   * // exhaustive example
   * const options = {
   *   baseUrl: 'http://baseurl/fhir',
   *   customHeaders: {
   *     'x-some-header': 'some-custom-value'
   *   },
   *   requestOptions: {
   *     cert: certFileContent,
   *     key: keyFileContent,
   *     ca: caFileContent
   *   },
   *   bearerToken: 'eyJhbGci...dQssw5c',
   *   requestSigner: (url, requestOptions) => {
   *      const signed = aws4.sign({
   *        path: url,
   *        service: 'healthlake',
   *        region: 'us-west-2',
   *        method: requestOptions.method
   *      });
   *      Object.keys(signed.headers).forEach((key) => {
   *        requestOptions.headers.set(key, signed[key]);
   *      });
   *    }
   * };
   *
   * const client = new Client(options);
   *
   * @param {Object} config Client configuration
   * @param {String} config.baseUrl ISS for FHIR server
   * @param {Object} [config.customHeaders] Optional custom headers to send with
   *   each request
   * @param {Object} [config.requestOptions] Optional custom request options for
   * @param {Function} [config.requestSigner] Optional pass in a function to sign the request.
   *   instantiating the HTTP connection
   * @param {String} [config.bearerToken] Optional bearerToken to use for each
   *   request.
   * @throws An error will be thrown unless baseUrl is a non-empty string.
   */
  constructor({ baseUrl, customHeaders, requestOptions, requestSigner, bearerToken } = {}) {
    this.httpClient = new HttpClient({ baseUrl, customHeaders, requestOptions, requestSigner });
    if (bearerToken) {
      this.httpClient.bearerToken = bearerToken;
    }
    this.resolver = new ReferenceResolver(this);
    this.pagination = new Pagination(this.httpClient);
  }

  /**
   * Given a Client response, returns the underlying HTTP request and response
   * objects.
   *
   * @static
   *
   * @example
   *
   * const Client = require('fhir-kit-client');
   *
   * fhirClient.read({
   *   resourceType: 'Patient',
   *   id: 12345,
   * }).then((data) => {
   *   const { response, request } = Client.httpFor(data);
   *   console.log(response.status);
   *   console.log(request.headers);
   * });
   *
   * @param {Object} requestResponse to one of the FHIR Kit Client requests
   * @return {Object} object containing http request and response
   */
  static httpFor(requestResponse) {
    return {
      request: HttpClient.requestFor(requestResponse),
      response: HttpClient.responseFor(requestResponse),
    };
  }

  /**
   * Get the baseUrl.
   *
   * @return {String} - Get the baseUrl
   */
  get baseUrl() {
    return this.httpClient && this.httpClient.baseUrl;
  }

  /**
   * Set the baseUrl.
   *
   * @param {String} url - Set the baseUrl
   * @throws An error will be thrown unless baseUrl is a non-empty string.
   */
  set baseUrl(url) {
    if (this.httpClient) {
      this.httpClient.baseUrl = url;
    }
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  resolve({ reference, context, headers, options = {} } = {}) {
    return this.resolver.resolve({
      reference,
      context,
      options: deprecateHeaders(options, headers),
    });
  }

  /**
   * Obtain the SMART OAuth URLs from the Capability Statement, or
   * any of the .well-known addresses.
   *
   * See: http://docs.smarthealthit.org/authorization/conformance-statement/
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} contains the following SMART URL: authorizeUrl,
   *   tokenUrl, registerUrl, manageUrl
   */
  async smartAuthMetadata({ headers, options = {} } = {}) {
    const fetchOptions = { options: deprecateHeaders(options, headers) };
    if (!(fetchOptions.options.headers)) {
      fetchOptions.options.headers = {};
    }
    fetchOptions.options.headers.accept = 'application/fhir+json,application/json';

    const normalizedBaseUrl = this.baseUrl.replace(/\/*$/, '/');

    const queue = new FetchQueue();
    const metadataJob = queue.buildJob();
    const wellknownSmartJob = queue.buildJob();
    const wellknownOidcJob = queue.buildJob();

    const errors = [];

    return new Promise((resolve, reject) => {
      function handleError(error) {
        if (errors.push(error) === queue.numJobs) {
          reject(new Error(errors.map((e) => e.message).join('; ')));
        }
      }

      this.httpClient.request('GET',
        `${normalizedBaseUrl}.well-known/smart-configuration`,
        wellknownSmartJob.addSignalOption(fetchOptions))
        .then((r) => {
          queue.safeAbortOthers(wellknownSmartJob);
          return resolve(authFromWellKnown(r));
        })
        .catch((e) => handleError(e));

      this.capabilityStatement(metadataJob.addSignalOption(fetchOptions))
        .then((r) => {
          queue.safeAbortOthers(metadataJob);
          return resolve(authFromCapability(r));
        })
        .catch((e) => handleError(e));

      this.httpClient.request('GET',
        `${normalizedBaseUrl}.well-known/openid-configuration`,
        wellknownOidcJob.addSignalOption(fetchOptions))
        .then((r) => {
          queue.safeAbortOthers(wellknownOidcJob);
          return resolve(authFromWellKnown(r));
        })
        .catch((e) => handleError(e));
    });
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} capability statement FHIR resource.
   */
  capabilityStatement({ headers, options = {} } = {}) {
    if (!this.metadata) {
      this.metadata = this.httpClient.get('metadata', deprecateHeaders(options, headers));
    }
    return this.metadata;
  }

  /**
   * Run a request.
   *
   * @example
   *
   * // Defaults to GET
   * fhirClient.request('Patient/123')
   *   .then(data => console.log(data));
   *
   * fhirClient.request('Patient/123', { method: 'DELETE'})
   *   .then(data => console.log(data));
   *
   * fhirClient.request('Patient', { method: 'POST', body: myNewPatient })
   *   .then(data => console.log(data));
   *
   * @param {String} requestUrl - URL, can be relative to base or absolute
   * @param {Object} params - (optional) Request params
   * @param {String} params.method - (optional) HTTP method (defaults to GET)
   * @param {Object} params.options - (optional) additional request options (e.g. headers)
   * @param {Object} params.body - (optional) request body
   * @return {Promise<Object>} Response
   */
  request(requestUrl, { method = 'GET', options = {}, body } = {}) {
    if (options.method && options.method !== method) {
      /* eslint-disable-next-line no-console */
      console.warn(`WARNING: 'options.method' has been specified: ${options.method} but will be ignored. Use 'method' instead.`);
    }
    return this.httpClient.request(method, requestUrl, options, body);
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  read({ resourceType, id, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }
    return this.httpClient.get(`${resourceType}/${id}`, deprecateHeaders(options, headers));
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  vread({ resourceType, id, version, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }
    return this.httpClient.get(
      `${resourceType}/${id}/_history/${version}`,
      deprecateHeaders(options, headers),
    );
  }

  /**
   * Create a resource.
   *
   * @example
   * const newPatient = {
   *   resourceType: 'Patient',
   *   active: true,
   *   name: [{ use: 'official', family: 'Coleman', given: ['Lisa', 'P.'] }],
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  create({ resourceType, body, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }
    return this.httpClient.post(resourceType, body, deprecateHeaders(options, headers));
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} Operation Outcome FHIR resource
   */
  delete({ resourceType, id, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }
    return this.httpClient.delete(`${resourceType}/${id}`, deprecateHeaders(options, headers));
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
   * @param {String} params.searchParams - For a conditional update the searchParams are specified instead of the id, see https://www.hl7.org/fhir/http.html#cond-update
   * @param {String} params.body - The resource to be updated.
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  update({ resourceType, id, searchParams, body, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }
    if (id && searchParams) {
      throw new Error('Conditional update with search params cannot be with id', resourceType);
    }
    if (searchParams) {
      const searchQuery = createQueryString(searchParams);
      return this.httpClient.put(
        `${resourceType}?${searchQuery}`,
        body,
        deprecateHeaders(options, headers),
      );
    }
    return this.httpClient.put(
      `${resourceType}/${id}`,
      body,
      deprecateHeaders(options, headers),
    );
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
   *   JSONPatch,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.patch({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   JSONPatch
   * });
   * console.log(response);
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param {String} params.id - The FHIR id for the resource.
   * @param {Array} params.JSONPatch - A JSON Patch document containing an array
   *   of patch operations, formatted according to http://jsonpatch.com/.
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  patch({ resourceType, id, JSONPatch, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }
    // Content-Type is 'application/json-patch+json'
    // Ref: http://hl7.org/fhir/STU3/http.html#patch
    const customHeaders = deprecateHeaders(options, headers).headers || {};
    const requestHeaders = { ...customHeaders, 'Content-Type': 'application/json-patch+json' };
    return this.httpClient.patch(
      `${resourceType}/${id}`,
      JSONPatch,
      { ...options, headers: requestHeaders },
    );
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  batch({ body, headers, options = {} } = {}) {
    return this.httpClient.post('/', body, deprecateHeaders(options, headers));
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  transaction({ body, headers, options = {} } = {}) {
    return this.httpClient.post('/', body, deprecateHeaders(options, headers));
  }

  /**
   * Run a custom FHIR operation on system, resource type or instance level.
   *
   * - To run a system-level operation, omit the resourceType and id parameters.
   * - To run a type-level operatiion, include the resourceType and omit the id parameter.
   * - To run an instance-type operation, include both the resourceType and id.
   *
   * @example
   *
   * client.operation({ resourceType: 'ConceptMap', name: '$apply' }).
   *   then(result => console.log(result).
   *   catch(e => console.error(e));
   *
   *
   * const input = {
   *  system: 'http://hl7.org/fhir/composition-status',
   *  code: 'preliminary',
   *  source: 'http://hl7.org/fhir/ValueSet/composition-status',
   *  target: 'http://hl7.org/fhir/ValueSet/v3-ActStatus'
   * };
   *
   * client.operation({resourceType: 'ConceptMap', name: 'translate', method: 'GET', input}).
   *   then(result => console.log(result)).
   *   catch(e => console.error(e));
   *
   * @param {String} params.name - The name of the operation (will get
   *    prepended with $ if missing.
   * @param {String} [params.resourceType] - Optional The resource type (e.g. "Patient",
   *   "Observation")
   * @param {String} [params.id] - Optional FHIR id for the resource
   * @param {String} [params.method] - Optional The HTTP method (post or get, defaults to post)
   * @param {Object} [params.input] - Optional input object for the operation
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} Result of opeartion (e.g. FHIR Parameter)
   */
  operation({ name, resourceType, id, method = 'POST', input, options = {} } = {}) {
    const url = ['/'];

    if (resourceType) {
      if (!validResourceType(resourceType)) {
        throw new Error('Invalid resourceType', resourceType);
      }
      url.push(`${resourceType}/`);
    }
    if (id) { url.push(`${id}/`); }

    url.push(`${name.startsWith('$') ? name : `$${name}`}`);

    if (method.toUpperCase() === 'POST') {
      return this.httpClient.post(url.join(''), input, options);
    }
    if (method.toUpperCase() === 'GET') {
      if (input) {
        url.push(`?${queryString.stringify(input)}`);
      }
      return this.httpClient.get(url.join(''), options);
    }
  }

  /**
   * Return the next page of results.
   *
   * @param {Object} params - The request parameters. Passing the bundle as the
   *   first parameter is DEPRECATED
   * @param {object} params.bundle - Bundle result of a FHIR search
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   * @param {Object} [headers] - DEPRECATED Optional custom headers to add to
   *   the request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  nextPage(params, headers) {
    const { bundle, options = {} } = deprecatePaginationArgs(params, headers);
    return this.pagination.nextPage(bundle, options);
  }

  /**
   * Return the previous page of results.
   *
   * @param {Object} params - The request parameters. Passing the bundle as the
   *   first parameter is DEPRECATED
   * @param {object} params.bundle - Bundle result of a FHIR search
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   * @param {Object} [headers] - DEPRECATED Optional custom headers to add to
   *   the request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  prevPage(params, headers) {
    const { bundle, options = {} } = deprecatePaginationArgs(params, headers);
    return this.pagination.prevPage(bundle, options);
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   * @param {Boolean} [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   *
   * @return {Promise<Object>} FHIR resources in a Bundle
   *
   * @throws {Error} if neither searchParams nor resourceType are supplied
   */
  search({ resourceType, compartment, searchParams, headers, options = {} } = {}) {
    if (resourceType && !validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }

    if (compartment && resourceType) {
      return this.compartmentSearch({
        resourceType,
        compartment,
        searchParams,
        options: deprecateHeaders(options, headers),
      });
    } if (resourceType) {
      return this.resourceSearch({
        resourceType,
        searchParams,
        options: deprecateHeaders(options, headers),
      });
    } if (searchParams instanceof Object && Object.keys(searchParams).length > 0) {
      return this.systemSearch({
        searchParams,
        options: deprecateHeaders(options, headers),
      });
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   * @param {Boolean} [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   *
   * @return {Promise<Object>} FHIR resources in a Bundle
   */
  resourceSearch({ resourceType, searchParams, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }

    let searchPath = resourceType;

    if (options.postSearch) {
      searchPath += '/_search';
    }

    return this.baseSearch({ searchPath, searchParams, headers, options });
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   * @param {Boolean} [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   *
   * @return {Promise<Object>} FHIR resources in a Bundle
   */
  systemSearch({ searchParams, headers, options = {} } = {}) {
    const searchPath = '/_search';

    return this.baseSearch({ searchPath, searchParams, headers, options });
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   * @param {Boolean} [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   *
   * @return {Promise<Object>} FHIR resources in a Bundle
   */
  compartmentSearch({ resourceType, compartment, searchParams, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }

    const { resourceType: compartmentType, id: compartmentId } = compartment;

    if (!validResourceType(compartmentType)) {
      throw new Error('Invalid compartmentType', compartmentType);
    }

    let searchPath = `/${compartmentType}/${compartmentId}/${resourceType}`;

    if (options.postSearch) {
      searchPath += '/_search';
    }

    return this.baseSearch({ searchPath, searchParams, headers, options });
  }

  /**
   * Perform a search
   *
   * @private
   *
   * @param {Object} params - The request parameters.
   * @param {String} params.searchPath - The url path
   * @param {Object} [params.searchParams] - The search parameters, optional
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   * @param {Boolean} [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle
   */
  baseSearch({ searchPath, searchParams, headers, options }) {
    const searchQuery = createQueryString(searchParams);
    const searchOptions = deprecateHeaders(options, headers);
    const searchFunction = options.postSearch ? 'postSearch' : 'getSearch';

    return this[searchFunction](searchPath, searchQuery, searchOptions);
  }

  /**
   * Perform a search using POST
   *
   * @private
   *
   * @param {String} path - The url path
   * @param {String} [query] - The query string, optional
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [options] - Optional options object
   * @param {Object} [options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle
   */
  postSearch(path, query, options) {
    const defaultHeader = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const postHeaders = { ...defaultHeader, ...options.headers };
    const postOptions = { ...options, headers: postHeaders };

    return this.httpClient.post(path, query, postOptions);
  }

  /**
   * Perform a search using GET
   *
   * @private
   *
   * @param {String} path - The url path
   * @param {String} [query] - The query string, optional
   * @param {Object} [options] - Optional options object
   * @param {Object} [options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle
   */
  getSearch(path, query, options) {
    let searchPath = path;
    if (query) {
      searchPath += `?${query}`;
    }

    return this.httpClient.get(searchPath, options);
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  history({ resourceType, id, headers, options = {} } = {}) {
    if (resourceType && !validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }

    if (id && resourceType) {
      return this.resourceHistory({
        resourceType,
        id,
        options: deprecateHeaders(options, headers),
      });
    } if (resourceType) {
      return this.typeHistory({
        resourceType,
        options: deprecateHeaders(options, headers),
      });
    }

    return this.systemHistory({ options: deprecateHeaders(options, headers) });
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  resourceHistory({ resourceType, id, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }

    return this.httpClient.get(
      `${resourceType}/${id}/_history`,
      deprecateHeaders(options, headers),
    );
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  typeHistory({ resourceType, headers, options = {} } = {}) {
    if (!validResourceType(resourceType)) {
      throw new Error('Invalid resourceType', resourceType);
    }

    return this.httpClient.get(
      `${resourceType}/_history`,
      deprecateHeaders(options, headers),
    );
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
   * @param {Object} [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param {Object} [params.options] - Optional options object
   * @param {Object} [params.options.headers] - Optional headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  systemHistory({ headers, options = {} } = {}) {
    return this.httpClient.get('_history', deprecateHeaders(options, headers));
  }
}

module.exports = Client;
module.exports.CapabilityTool = CapabilityTool;
