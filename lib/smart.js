const { URL } = require('url');

const smartOauthUrl = 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris';
const { logError } = require('./logging');

/**
 * Get the SMART OAuth URIs from a Capability Statement
 * http://docs.smarthealthit.org/authorization/conformance-statement/
 *
 * @example
 *
 * {
 *   authorizeUrl,
 *   tokenUrl,
 *   registerUrl,
 *   manageUrl,
 * } = authFromCapability(capabilityStatement);
 *
 * @param {Object} capabilityStatement - a FHIR capabilityStatement
 * @return {Object} contains the following SMART URIs: authorizeUrl, tokenUrl,
 *   registerUrl, manageUrl
 */
function authFromCapability(capabilityStatement) {
  const authMetadata = {};

  try {
    capabilityStatement.rest.forEach((restItem) => {
      const uris = restItem.security.extension.find(x => x.url === smartOauthUrl);

      uris.extension.forEach((ext) => {
        switch (ext.url) {
          case 'authorize':
            authMetadata.authorizeUrl = new URL(ext.valueUri);
            break;
          case 'token':
            authMetadata.tokenUrl = new URL(ext.valueUri);
            break;
          case 'register':
            authMetadata.registerUrl = new URL(ext.valueUri);
            break;
          case 'manage':
            authMetadata.manageUrl = new URL(ext.valueUri);
            break;
          default:
        }
      });
    });
    return authMetadata;
  } catch (error) {
    logError(error);
    return authMetadata;
  }
}

module.exports = {
  authFromCapability,
};
