const queryString = require('query-string');
const { fhirReferenceRegEx } = require('./fhir-regular-expressions');

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

/**
 * Is the string a valid resource type?
 *
 * The type is the Canonical URL of Resource Definition that is the type this
 * reference refers to. References are URLs that are relative to
 * http://hl7.org/fhir/StructureDefinition/ e.g. "Patient" is a reference to
 * http://hl7.org/fhir/StructureDefinition/Patient. Absolute URLs are only
 * allowed for logical models (and can only be used in references in logical
 * models, not resources).
 *
 * Since this is a library to request resource, we can assume we will never
 * be dealing with logical models. Also, since the binding is extensible,
 * this implementation does not use a valueset of resourceTypes to test.
 *
 * @see https://www.hl7.org/fhir/references-definitions.html#Reference.type
 *
 * @param {String} resourceType the FHIR resource type
 * @return {boolean} is valid resource type
 */
function validResourceType(resourceType) {
  return (
    !resourceType.startsWith('/')
    && !resourceType.includes(':')
    && /\S/.test(resourceType)
  );
}

function createQueryString(queryParams) {
  if (queryParams instanceof Object && Object.keys(queryParams).length > 0) {
    return queryString.stringify(queryParams);
  }
}

module.exports = {
  createQueryString,
  splitReference,
  validResourceType,
};
