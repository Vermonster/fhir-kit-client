/* eslint-disable func-names */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { expect } = require('chai');
const nock = require('nock');

const { Client } = require('../lib/client');

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
        .reply(200, () => fs.createReadStream(path.normalize(`${__dirname}/fixtures/capability-statement.json`, 'utf8')));

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
        .reply(200, () => fs.createReadStream(path.normalize(`${__dirname}/fixtures/patient.json`, 'utf8')));

      const response = await this.fhirClient.read('Patient', 'eb3271e1-ae1b-4644-9332-41e32c829486');

      expect(response.resourceType).to.equal('Patient');
      expect(response.id).to.equal('eb3271e1-ae1b-4644-9332-41e32c829486');
    });

    it('responds to #read, returning operation outcome if not found', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient/abcdef')
        .reply(404, () => fs.createReadStream(path.normalize(`${__dirname}/fixtures/patient-not-found.json`, 'utf8')));

      const response = await this.fhirClient.read('Patient', 'abcdef');

      expect(response.resourceType).to.equal('OperationOutcome');
    });
  });
});
