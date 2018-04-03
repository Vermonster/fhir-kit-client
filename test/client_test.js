/* eslint-disable func-names */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { expect } = require('chai');
const nock = require('nock');

const { Client } = require('../lib/client');

function readStreamFor(fixture) {
  return fs.createReadStream(path.normalize(`${__dirname}/fixtures/${fixture}`, 'utf8'));
}

describe('Client', () => {
  it('initializes with config', function () {
    const baseUrl = 'https://test.com';
    const config = { baseUrl };
    this.fhirClient = new Client(config);

    expect(this.fhirClient.baseUrl).to.deep.equal(new URL(baseUrl));
  });

  describe('instance', () => {
    const baseUrl = 'http://test.com';

    beforeEach(function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/metadata')
        .reply(200, () => readStreamFor('capability-statement.json'));

      const config = { baseUrl };
      this.fhirClient = new Client(config);
    });

    it('responds to #capabilityStatement(), returning FHIR resource', async function () {
      const capabilityStatement = await this.fhirClient.capabilityStatement();

      expect(capabilityStatement.resourceType).to.equal('CapabilityStatement');
    });

    it('responds to #authMetadata(), returning SMART OAuth URIs', async function () {
      const authMetadata = await this.fhirClient.smartAuthMetadata();

      expect(authMetadata).to.deep.equal({
        authorizeUrl: new URL('https://sb-auth.smarthealthit.org/authorize'),
        tokenUrl: new URL('https://sb-auth.smarthealthit.org/token'),
        registerUrl: new URL('https://sb-auth.smarthealthit.org/register'),
      });
    });

    it('responds to #read, returning a matching resource', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient/eb3271e1-ae1b-4644-9332-41e32c829486')
        .reply(200, () => readStreamFor('patient.json'));

      const response = await this.fhirClient.read('Patient', 'eb3271e1-ae1b-4644-9332-41e32c829486');

      expect(response.resourceType).to.equal('Patient');
      expect(response.id).to.equal('eb3271e1-ae1b-4644-9332-41e32c829486');
    });

    it('responds to #read, throwing any errors that occur', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient/abcdef')
        .reply(404, () => readStreamFor('patient-not-found.json'));

      let response;
      try {
        response = await this.fhirClient.read('Patient', 'abcdef');
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
      }
      expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
    });
  });
});
