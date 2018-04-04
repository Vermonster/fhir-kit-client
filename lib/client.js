const { URLSearchParams } = require('url');
const { authFromCapability } = require('./smart');
const HttpClient = require('./http-client');
const { referenceRegex } = require('./fhir-regular-expressions');

/** Class for a FHIR client. */
class Client {
  /**
   * Create a FHIR client.
   *
   * @param {Object} config Client configuration
   * @param {string} config.baseUrl ISS for FHIR server
   */
  constructor(config) {
    this.httpClient = new HttpClient({ baseUrl: config.baseUrl });
    this.baseUrl = config.baseUrl;
  }

  /**
   * Get the httpClient's baseURL value.
   *
   * @return {string}
   */
  get baseUrl() {
    return this.httpClient.axiosInstance.defaults.baseURL;
  }

  /**
   * Set the httpClient's baseURL value to a URL string.
   *
   * @param {string} url
   */
  set baseUrl(url) {
    this.httpClient.axiosInstance.defaults.baseURL = url;
  }

  /**
   * Set the axios Authorization header to "Bearer ${token}".
   *
   * @param {string} token The access token value.
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
   * client.resolve("http://test.com/fhir/Patient/1").then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Always does a new http request, using the client.baseUrl
   * client.resolve("Patient/1").then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Try to resolve a patient in the bundle, otherwise build request
   * // at client.baseUrl
   * client.resolve("Patient/1", bundle).then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Resolve a patient contained in someResource (see:
   * // http://hl7.org/fhir/STU3/references.html#contained)
   * client.resolve("#patient-1", someResource).then((patient) => {
   *   console.log(patient);
   * });
   *
   * @param {string} reference the FHIR reference
   * @param {object} [context] bundle or FHIR resource, optional
   *
   * @return {Promise<Object>} FHIR resource
   */
  async resolve(reference, context) {
    // throw some error if it does not match the regex;
    if (reference.startsWith('http')) {
      return this.resolveAbsoluteReference(reference);
    }
    if (context === undefined) {
      return this.httpClient.get(this.buildUrl(reference));
    }
    if (reference.startWith('#')) {
      return resolveContainedReference(reference, context);
    }
    return resolveBundleReference(reference, context);
  }

  /**
   * Private function for Client to resolve absolute references
   *
   * @private
   *
   * @async
   *
   * @return {Promise<Object>} FHIR resource
   */
  async resolveAbsoluteReference(reference) {
    if (reference.startsWith(this.baseUrl)) {
      return this.httpClient.get(reference);
    } else {
      const { baseUrl, type, id } = splitReference(reference);
      return (new Client(baseUrl)).read(type, id);
    }
  }

  /**
   * Private function for Client to resolve contained references
   *
   * @private
   *
   * @return {Object} FHIR resource
   */
  resolveContainedReference(reference, context) {
    if (context.contained) {
      const referenceId = reference.slice(1);
      const resource = context.contained.find(resource => resource.id === referenceId);
      if (resource) {
        return resource;
      }
    }
    throw(`Unable to resolve contained reference: ${reference}`);
  }

  /**
   * Private function for Client to resolve references in a bundle. If not
   * contained in the bundle, the resources will be fetched from a FHIR server.
   *
   * @private
   *
   * @async
   *
   * @return {Promise<Object>} FHIR resource
   */
  async resolveBundleReference(reference, bundle) {
    const referenceRegEx = new RegExp(`(^|/)${reference}$`);
    const entry = bundle.entries.find(entry => referenceRegEx.test(entry.fullUrl));
    if (!entry) {
      return await this.resolve(reference);
    }
    return entry.resource;
  }

  /**
   * Split a FHIR reference into its baseUrl (if present), type, and id
   *
   * @example
   *
   * { baseUrl, type, id } = splitReference('http://www.example.com/fhir/Patient/1')
   * { type, id } = splitReference('Patient/1')
   *
   * @return {Object} Contains baseUrl, type, and id fields. baseUrl will be
   * undefined for relative references
   */
  splitReference(reference) {
    let baseUrl;
    if (reference.startsWith('http')) {
      baseUrl = referenceRegEx.exec(reference)[0];
      reference = reference.slice(baseUrl.length);
    }
    const [type, id] = relativeReference.split('/');
    return {
      baseUrl,
      type,
      id,
    };
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
   * @param {string} params.resourceType - The resource type (e.g. "Patient", "Observation").
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
