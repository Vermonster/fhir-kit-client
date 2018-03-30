'use strict';

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { expect } = require('chai');
const nock = require('nock');

const fhirClientModule = require('../lib/client');

describe('Client', function() {
  it('initializes with config', function() {
    let baseUrl = 'https://test.com';
    let config = { baseUrl: baseUrl };
    this.fhirClient = new fhirClientModule(config);

    expect(this.fhirClient.baseUrl).to.deep.equal(new URL(baseUrl));
  });

  describe('instance methods', function() {
    beforeEach(function() {
      let baseUrl = 'http://test.com';

      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/metadata')
        .reply(200, (uri, requestBody) => {
            return fs.createReadStream(path.normalize(__dirname + '/fixtures/capability-statement.json', 'utf8'))
          });

      let config = { baseUrl: baseUrl };
      this.fhirClient = new fhirClientModule(config);
    });

    it('#authMetadata returns SMART oAuth URIs', async function() {
      let authMetadata = await this.fhirClient.smartAuthMetadata();

      expect(authMetadata).to.deep.equal({
          authorizeUrl: "https://sb-auth.smarthealthit.org/authorize",
          tokenUrl: "https://sb-auth.smarthealthit.org/token",
          registerUrl: "https://sb-auth.smarthealthit.org/register"
        });
    });

  });
});
