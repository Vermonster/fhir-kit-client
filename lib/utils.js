const queryString = require('query-string');
const { fhirReferenceRegEx, fhirIdRegEx, fhirVersionRegEx, fhirResourceTypeRegEx } = require('./fhir-regular-expressions');

/**
 * Split a FHIR reference into its baseUrl (if present), type, and id
 *
 * @example
 *
 * // With an absolute reference
 * { baseUrl, resourceType, id } = splitReference('http://www.example.com/fhir/Patient/1');
 * console.log(`${baseUrl}/${resourceType}/${id}`);
 *
 * // With a relative reference
 * { resourceType, id } = splitReference('Patient/1');
 * console.log('${resourceType}/${id}');
 *
 * @param {String} reference the FHIR reference
 *
 * @return {Object} Contains baseUrl, resourceType, and id fields. baseUrl will be
 * undefined for relative references
 */
function splitReference(reference) {
  if (!reference.match(fhirReferenceRegEx)) {
    throw new Error(`${reference} is not a recognized FHIR reference`);
  }
  let baseUrl;
  let relativeReference = reference;
  if (reference.startsWith('http')) {
    [, baseUrl] = fhirReferenceRegEx.exec(reference);
    relativeReference = reference.slice(baseUrl.length);
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
  }
  const [resourceType, id] = relativeReference.split('/');
  return {
    baseUrl,
    resourceType,
    id,
  };
}

function createQueryString(queryParams) {
  if (queryParams instanceof Object && Object.keys(queryParams).length > 0) {
    return queryString.stringify(queryParams);
  }
}
/**
   * Validate the parameters according to FHIR datatype format
   * Any combination of upper- or lower-case ASCII letters ('A'..'Z', and 'a'..'z',
   * numerals ('0'..'9'), '-' and '.', with a length limit of 64 characters.
   *
   * @param {Object} parameters - The FHIR parameters to validate
   * @param {string} parameters.resourceType - ResourceType to validate
   * @param {string} parameters.id - ID to validate
   * @param {boolean} parameters.requireId Make sure the ID is not undefined
   * @param {string} parameters.version - Version to validate
   * @param {boolean} parameters.requireVersion - Make sure the version must be validated
   * @throws An error if the ID is not valid
   *
   */

function validateParameters({ resourceType, id, requireId, version, requireVersion }) {
  if (typeof resourceType !== 'string' || !fhirResourceTypeRegEx.test(resourceType)) {
    throw new Error('Invalid FHIR resourceType.');
  }
  if ((id !== undefined || requireId) && (typeof id !== 'string' || !fhirIdRegEx.test(id))) {
    throw new Error('Invalid FHIR ID.');
  }

  if ((version !== undefined || requireVersion) && (typeof version !== 'string' || !fhirVersionRegEx.test(version))) {
    throw new Error('Invalid FHIR version.');
  }
}

module.exports = {
  createQueryString,
  splitReference,
  validateParameters,
};
