import { logError } from './logging.js';
import type { FhirResource, SmartAuthMetadata } from './types.js';

const smartOauthUrl = 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris';

interface CapabilityRestSecurity {
  extension?: Array<{
    url: string;
    extension?: Array<{ url: string; valueUri?: string }>;
  }>;
}

interface CapabilityRest {
  security?: CapabilityRestSecurity;
}

/**
 * Extract SMART OAuth URLs from a FHIR CapabilityStatement.
 */
export function authFromCapability(capabilityStatement: FhirResource): SmartAuthMetadata {
  const authMetadata: SmartAuthMetadata = {};

  try {
    const restItems = capabilityStatement.rest as CapabilityRest[] | undefined;
    if (!restItems) return authMetadata;

    for (const restItem of restItems) {
      const uris = restItem.security?.extension?.find((x) => x.url === smartOauthUrl);
      if (!uris?.extension) continue;

      for (const ext of uris.extension) {
        if (!ext.valueUri) continue;
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
        }
      }
    }
  } catch (error) {
    logError(error);
  }

  return authMetadata;
}

interface WellKnownConfig {
  authorization_endpoint?: string;
  token_endpoint?: string;
  registration_endpoint?: string;
}

/**
 * Extract SMART OAuth URLs from a .well-known configuration document.
 */
export function authFromWellKnown(wellKnown: FhirResource): SmartAuthMetadata {
  const config = wellKnown as unknown as WellKnownConfig;
  return {
    authorizeUrl: config.authorization_endpoint ? new URL(config.authorization_endpoint) : undefined,
    tokenUrl: config.token_endpoint ? new URL(config.token_endpoint) : undefined,
    registerUrl: config.registration_endpoint ? new URL(config.registration_endpoint) : undefined,
  };
}
