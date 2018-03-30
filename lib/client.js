'use strict';

const { URL, URLSearchParams } = require('url');
const axios = require("axios");

const smartOauthUrl = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";

class Client {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.authMetadata = {};
  }

  get baseUrl() {
    return this._baseUrl;
  }

  set baseUrl(url) {
    this._baseUrl = new URL(url);
  }

  appendPath(path) {
    return new URL(this.baseUrl.toString().replace(/\/$/,'') + path);
  }

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

  headers() {
    let _headers = { Accept: 'application/json+fhir' };
    if (this.bearerToken) {
      _headers.Bearer = this.bearerToken;
    }
    return _headers;
  }

  async httpGet(url) {
    try {
      axios.defaults.headers.common['Accept'] = 'application/json+fhir';
      const response = await axios.get(url.toString());
      const data = response.data;
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  // TODO: memoize this
  async capabilityStatement() {
    let url = this.appendPath('/metadata');
    return this.httpGet(url);
  }

  get(resource, identifier) {
    let url = this.appendPath('/' + resource + '/' + identifier);
    return this.httpGet(url);
  }

  search(resource, opts) {
    let params = new URLSearchParams(opts);
    let url = this.appendPath('/' + resource);
    url.search = params;
    return this.httpGet(url);
  }

};

module.exports = Client;
