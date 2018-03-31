const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { expect } = require('chai');
const nock = require('nock');

const fhirClientModule = require('../lib/client');

describe('Client', () => {
  it('initializes with config', function () {
    const baseUrl = 'https://test.com';
    const config = { baseUrl };
    this.fhirClient = new fhirClientModule(config);

    expect(this.fhirClient.baseUrl).to.deep.equal(new URL(baseUrl));
  });

  describe('instance', () => {
    beforeEach(function () {
      const baseUrl = 'http://test.com';

      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/metadata')
        .reply(200, (uri, requestBody) => fs.createReadStream(path.normalize(`${__dirname}/fixtures/capability-statement.json`, 'utf8')));

      const config = { baseUrl };
      this.fhirClient = new fhirClientModule(config);
    });

    it('responds to #capabilityStatement(), returning FHIR resource', async function () {
      const capabilityStatement = await this.fhirClient.capabilityStatement();

      expect(capabilityStatement.resourceType).to.equal('CapabilityStatement');
    });

    it('responds to #authMetadata(), returning SMART OAuth URIs', async function () {
      const authMetadata = await this.fhirClient.smartAuthMetadata();

      expect(authMetadata).to.deep.equal({
        authorizeUrl: 'https://sb-auth.smarthealthit.org/authorize',
        tokenUrl: 'https://sb-auth.smarthealthit.org/token',
        registerUrl: 'https://sb-auth.smarthealthit.org/register',
      });
    });
  });
});
