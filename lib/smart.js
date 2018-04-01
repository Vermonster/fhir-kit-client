const smartOauthUrl = 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris';

/**
 * Get the smart oauth URIs from a Capability Statement
 *
 * @example
 *
 * oauthUris = authFromCapability(capabilityStatement);
 *
 * @params {object} capabilityStatement a FHIR capabilityStatement
 * @return {object} authMetadata
 */
function authFromCapability(capabilityStatement) {
  const authMetadata = {};

  try {
    capabilityStatement.rest.forEach((restItem) => {
      restItem.security.service.forEach((serviceItem) => {
        serviceItem.coding.forEach((codingItem) => {
          if (codingItem.code === 'SMART-on-FHIR') {
            const uris = restItem.security.extension.find((x) => {
              if (x.url === smartOauthUrl) { return x; }
              return false;
            });

            uris.extension.forEach((ext) => {
              switch (ext.url) {
                case 'authorize':
                  authMetadata.authorizeUrl = ext.valueUri;
                  break;
                case 'token':
                  authMetadata.tokenUrl = ext.valueUri;
                  break;
                case 'register':
                  authMetadata.registerUrl = ext.valueUri;
                  break;
                case 'launch-registration':
                  authMetadata.launchRegisterUrl = ext.valueUri;
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
    console.log(error); // eslint-disable-line no-console
    return authMetadata;
  }
}

module.exports = { authFromCapability };
