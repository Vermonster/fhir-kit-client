const { fhirReferenceRegEx } = require('./fhir-regular-expressions');

/**
 * Split a FHIR reference into its baseUrl (if present), type, and id
 *
 * @example
 *
 * { baseUrl, resourceType, id } = splitReference('http://www.example.com/fhir/Patient/1')
 * { resourceType, id } = splitReference('Patient/1')
 *
 * @param {String} reference the FHIR reference
 *
 * @return {Object} Contains baseUrl, resourceType, and id fields. baseUrl will be
 * undefined for relative references
 */
function splitReference(reference) {
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

module.exports = {
  splitReference,
};
