const { splitReference } = require('./utils');
const { deprecateHeaders } = require('./deprecations');

/**
 * Class used by Client to resolve FHIR References. Do not use this class
 * directly, use Client#resolve instead.
 *
 * @private
 */
module.exports = class {
  /**
   * Create a Reference Resolver.
   *
   * @param {Client} client FHIR Client
   */
  constructor(client) {
    this.client = client;
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
   * @param {Object} [params.options.headers] - Optional custom headers to add
   *   to the request
   *
   * @return {Promise<Object>} FHIR resource
   */
  async resolve({ reference, context, headers, options = {} } = {}) {
    if (context === undefined) {
      if (reference.startsWith('http')) {
        return this.resolveAbsoluteReference(reference, deprecateHeaders(options, headers));
      }
      return this.client.httpClient.get(reference, deprecateHeaders(options, headers));
    }
    if (reference.startsWith('#')) {
      return this.resolveContainedReference(reference, context);
    }
    return this.resolveBundleReference(reference, context, deprecateHeaders(options, headers));
  }

  /**
   * Private function to resolve absolute references
   *
   * @private
   *
   * @async
   *
   * @param {String} reference - the FHIR reference
   * @param {Object} [options] - Optional options object
   * @param {Object} [options.headers] - Optional custom headers to add to the
   *   request
   *
   * @return {Promise<Object>} FHIR resource
   */
  async resolveAbsoluteReference(reference, options) {
    if (reference.startsWith(this.client.baseUrl)) {
      return this.client.httpClient.get(reference, options);
    }
    const { baseUrl, resourceType, id } = splitReference(reference);
    const Client = require('./client'); // eslint-disable-line global-require
    return (new Client({ baseUrl })).read({ resourceType, id, options });
  }

  /**
   * Private function to resolve contained references
   *
   * @private
   *
   * @param {String} reference - the FHIR reference
   * @param {Object} [context] - FHIR resource
   *
   * @return {Object} FHIR resource
   * @throws Will throw if a contained resource which matches the reference
   *   can't be found
   */
  resolveContainedReference(reference, context) { // eslint-disable-line class-methods-use-this
    if (context.contained) {
      const referenceId = reference.slice(1);
      const containedResource = context.contained.find((resource) => resource.id === referenceId);
      if (containedResource) {
        return containedResource;
      }
    }
    throw (new Error(`Unable to resolve contained reference: ${reference}`));
  }

  /**
   * Private function to resolve references in a bundle. If not contained in the
   * bundle, the resources will be fetched from a FHIR server.
   *
   * @private
   *
   * @async
   *
   * @param {String} reference - the FHIR reference
   * @param {Object} bundle - FHIR bundle
   * @param {Object} [options] - Optional options object
   * @param {Object} [options.headers] - Optional custom headers to add to the request
   *
   * @return {Promise<Object>} - FHIR resource
   */
  async resolveBundleReference(reference, bundle, options) {
    const referenceRegEx = new RegExp(`(^|/)${reference}$`);
    const entry = bundle.entry.find((bundleEntry) => referenceRegEx.test(bundleEntry.fullUrl));

    if (!entry) {
      return this.resolve({ reference, options });
    }
    return entry.resource;
  }
};
