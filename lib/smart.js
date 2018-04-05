const { URL } = require('url');

const smartOauthUrl = 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris';
const { logError } = require('./logging');

/**
 * Get the smart oauth URIs from a Capability Statement
 *
 * @example
 *
 * oauthUris = authFromCapability(capabilityStatement);
 *
 * @params {Object} capabilityStatement a FHIR capabilityStatement
 * @return {Object} authMetadata
 */
function authFromCapability(capabilityStatement) {
  const authMetadata = {};

  try {
    capabilityStatement.rest.forEach((restItem) => {
      restItem.security.service.forEach((serviceItem) => {
        serviceItem.coding.forEach((codingItem) => {
          if (codingItem.code === 'SMART-on-FHIR') {
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
                case 'launch-registration':
                  authMetadata.launchRegisterUrl = new URL(ext.valueUri);
                  break;
                default:
              }
            });
          }
        });
      });
    });
    return authMetadata;
  } catch (error) {
    logError(error);
    return authMetadata;
  }
}

module.exports = { authFromCapability };
