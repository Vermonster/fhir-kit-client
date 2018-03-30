'use strict';

const { URL, URLSearchParams } = require('url');
const axios = require("axios");

const smartOauthUrl = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";

/**
 * Private function for Client to use for http requests
 *
 * @private
 * @return {object} response from server parsed as JSON
 */
async function httpGet(url) {
  try {
    axios.defaults.headers.common['Accept'] = 'application/json+fhir';
    const response = await axios.get(url.toString());
    const data = response.data;
    return data;
  } catch (error) {
    console.log(error);
  }
};

/** Class for a FHIR client. */
class Client {
  /**
   * Create a FHIR client.
   * @param {object} config Client configuration
   * @param.baseUrl {string} ISS for FHIR server
   */
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.authMetadata = {};
  }

  /**
   * Get the baseUrl value.
   * @return {URL}
   */
  get baseUrl() {
    return this._baseUrl;
  }

  /**
   * Set the baseUrl value to a URL Object.
   * @param {string} string-version of the Url.
   */
  set baseUrl(url) {
    this._baseUrl = new URL(url);
  }

  /**
   * Create a new URL object with an appended path.
   * @private
   *
   * @param {string} path The path to append to the current baseUrl
   * @return {URL} New URL object with path
   */
  appendedUrl(path) {
    return new URL(this.baseUrl.toString().replace(/\/$/,'') + path);
  }

  /**
   * Obtain the SMART OAuth URLs from the Capability Statement
   *
   * @async
   *
   * @example
   * // Using promises
   * fhirClient.smartAuthMetadata().then((data) => { console.log(data); });
   * // Using async
   * let response = await fhirClient.smartAuthMetadata();
   * console.log(response);
   *
   * @return {Promise<Object>} Structure of urls for OAuth
   */
  async smartAuthMetadata() {
    let capabilityStatement = await this.capabilityStatement();

    capabilityStatement.rest.forEach((restItem) => {
      restItem.security.service.forEach((serviceItem) => {
        serviceItem.coding.forEach((codingItem) => {
          if (codingItem.code === 'SMART-on-FHIR') {
            let uris = restItem.security.extension.find((x) => { if (x.url == smartOauthUrl) { return x; } });

            uris.extension.forEach((ext) => {
              switch(ext.url) {
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
            })
          }
        })
      })
    });
    return this.authMetadata;
  }

  /**
   * Get the capability statement.
   *
   * @async
   *
   * @example
   * // Using promises
   * fhirClient.capabilityStatement().then((data) => { console.log(data); });
   * // Using async
   * let response = await fhirClient.capabilityStatement();
   * console.log(response);
   *
   * @return {Promise<Object>} capability statement FHIR resource.
   */
  capabilityStatement() {
    let url = this.appendedUrl('/metadata');
    return httpGet(url);
  }

  /**
   * Get a resource by identifier.
   *
   * @example
   *
   * // Using promises
   * fhirClient.get('Patient', 12345).then((data) => { console.log(data); });
   * // Using async
   * let response = await fhirClient.get('Patient', 12345);
   * console.log(response);
   *
   * @return {Promise<Object>} FHIR resource
   */
  get(resource, identifier) {
    let url = this.appendedUrl('/' + resource + '/' + identifier);
    return httpGet(url);
  }

  /**
   * Search for FHIR resources.
   *
   * @example
   *
   * // Using promises
   * fhirClient.search('Patient', { name: 'smith' }).then((data) => { console.log(data); });
   * // Using async
   * let response = await fhirClient.search('Patient', { name: 'smith'});
   * console.log(response);
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  search(resource, opts) {
    let params = new URLSearchParams(opts);
    let url = this.appendedUrl('/' + resource);
    url.search = params;
    return httpGet(url);
  }
};

module.exports = Client;
