const { URL, URLSearchParams } = require('url');
const axios = require('axios');

const smartOauthUrl = 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris';

/**
 * Private function for Client to use for http requests
 *
 * @private
 *
 * @return {object} response from server parsed as JSON
 */
async function httpGet(url) {
  try {
    axios.defaults.headers.common.Accept = 'application/json+fhir';
    const response = await axios.get(url.toString());
    const data = response.data;
    return data;
  } catch (error) {
    console.log(error);
  }
  return;
}

/** Class for a FHIR client. */
class Client {
  /**
   * Create a FHIR client.
   *
   * @param {object} config Client configuration
   * @param.baseUrl {string} ISS for FHIR server
   */
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.authMetadata = {};
  }

  /**
   * Get the baseUrl value.
   *
   * @return {URL}
   */
  get baseUrl() {
    return this._baseUrl;
  }

  /**
   * Set the baseUrl value to a URL Object.
   *
   * @param {string} string-version of the Url.
   */
  set baseUrl(url) {
    this._baseUrl = new URL(url);
  }

  /**
   * Create a new URL object with an appended path.
   *
   * @private
   *
   * @param {string} path The path to append to the current baseUrl
   *
   * @return {URL} New URL object with path
   */
  appendedUrl(path) {
    return new URL(this.baseUrl.toString().replace(/\/$/, '') + path);
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

    capabilityStatement.rest.forEach((restItem) => {
      restItem.security.service.forEach((serviceItem) => {
        serviceItem.coding.forEach((codingItem) => {
          if (codingItem.code === 'SMART-on-FHIR') {
            const uris = restItem.security.extension.find((x) => { if (x.url == smartOauthUrl) { return x; } });

            uris.extension.forEach((ext) => {
              switch (ext.url) {
                case 'authorize':
                  this.authMetadata.authorizeUrl = ext.valueUri;
                  break;
                case 'token':
                  this.authMetadata.tokenUrl = ext.valueUri;
                  break;
                case 'register':
                  this.authMetadata.registerUrl = ext.valueUri;
                  break;
                case 'launch-registration':
                  this.authMetadata.launchRegisterUrl = ext.valueUri;
                  break;
              }
            });
          }
        });
      });
    });
    return this.authMetadata;
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
    const url = this.appendedUrl('/metadata');
    return httpGet(url);
  }

  /**
   * Get a resource by identifier.
   *
   * @example
   *
   * // Using promises
   * fhirClient.read('Patient', 12345).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.read('Patient', 12345);
   * console.log(response);
   *
   * @param {string} resource The resource type (e.g. "Patient", "Observation")
   * @param {string} identifier The FHIR identifier for the resource
   *
   * @return {Promise<Object>} FHIR resource
   */
  read(resource, identifier) {
    const url = this.appendedUrl(`/${resource}/${identifier}`);
    return httpGet(url);
  }

  /**
   * Get a resource by identifier and version.
   *
   * @example
   *
   * // Using promises
   * fhirClient.vread('Patient', 12345, 1).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.vread('Patient', 12345, 1);
   * console.log(response);
   *
   * @param {string} resource The resource type (e.g. "Patient", "Observation")
   * @param {string} identifier The FHIR identifier for the resource
   * @param {string} version The version identifier for the resource
   *
   * @return {Promise<Object>} FHIR resource
   */
  vread(resource, identifier, version) {
    const url = this.appendedUrl(`/${resource}/${identifier}/_history/${version}`);
    return httpGet(url);
  }

  /**
   * Search for FHIR resources.
   *
   * @example
   *
   * // Using promises
   * fhirClient.search('Patient', { name: 'smith' }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.search('Patient', { name: 'smith'});
   * console.log(response);
   *
   * @param {string} resource The resource type (e.g. "Patient", "Observation")
   * @param {object} params The search parameters.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  search(resource, params) {
    const _params = new URLSearchParams(params);
    const url = this.appendedUrl(`/${resource}`);
    url.search = _params;
    return httpGet(url);
  }
}

module.exports = Client;
