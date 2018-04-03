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

    it('responds to #create, returning a successful operation outcome', async function () {
      const newPatient = {
        resourceType: 'Patient',
        active: true,
        name: [{ use: 'official', family: ['Coleman'], given: ['Lisa', 'P.'] }],
        gender: 'female',
        birthDate: '1948-04-14',
      };

      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .post('/Patient')
        .reply(201, () => readStreamFor('patient-created.json'));

      const response = await this.fhirClient.create({ resourceType: 'Patient', body: newPatient });

      expect(response.resourceType).to.deep.equal('OperationOutcome');
    });

    it('responds to #read, returning a matching resource', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient/eb3271e1-ae1b-4644-9332-41e32c829486')
        .reply(200, () => readStreamFor('patient.json'));

      const response = await this.fhirClient.read({ resourceType: 'Patient', identifier: 'eb3271e1-ae1b-4644-9332-41e32c829486' });

      expect(response.resourceType).to.equal('Patient');
      expect(response.id).to.equal('eb3271e1-ae1b-4644-9332-41e32c829486');
    });

    it('responds to #read, throwing any errors for a missing resource', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient/abcdef')
        .reply(404, () => readStreamFor('patient-not-found.json'));

      let response;
      try {
        response = await this.fhirClient.read({ resourceType: 'Patient', identifier: 'abcdef' });
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
      }
      expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
    });

    it('responds to #vread, returning a matching resource', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient/eb3271e1-ae1b-4644-9332-41e32c829486/_history/1')
        .reply(200, () => readStreamFor('patient.json'));

      const response = await this.fhirClient.vread({ resourceType: 'Patient', identifier: 'eb3271e1-ae1b-4644-9332-41e32c829486', version: '1' });

      expect(response.resourceType).to.equal('Patient');
      expect(response.id).to.equal('eb3271e1-ae1b-4644-9332-41e32c829486');
    });

    it('responds to #vread, throwing any errors for an absent resource', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient/abcdef/_history/1')
        .reply(404, () => readStreamFor('patient-not-found.json'));

      let response;
      try {
        response = await this.fhirClient.vread({ resourceType: 'Patient', identifier: 'abcdef', version: '1' });
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
      }
      expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
    });

    it('responds to #vread, throwing any errors for an absent version of an existing resource', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient/eb3271e1-ae1b-4644-9332-41e32c829486/_history/2')
        .reply(404, () => readStreamFor('patient-version-not-found.json'));

      let response;
      try {
        response = await this.fhirClient.vread({ resourceType: 'Patient', identifier: 'eb3271e1-ae1b-4644-9332-41e32c829486', version: '2' });
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
      }
      expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
    });

    it('responds to #search, returning a matching search results bundle', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient?name=abbott')
        .reply(200, () => readStreamFor('search-results.json'));

      const response = await this.fhirClient.search({ resourceType: 'Patient', searchParams: { name: 'abbott' } });

      expect(response.resourceType).to.equal('Bundle');
      expect(response.id).to.equal('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
    });

    it('responds to #search, returning an empty search results bundle if no match is found', async function () {
      nock(baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient?name=abcdef')
        .reply(200, () => readStreamFor('empty-search-results.json'));

      const response = await this.fhirClient.search({ resourceType: 'Patient', searchParams: { name: 'abcdef' } });

      expect(response.resourceType).to.equal('Bundle');
      expect(response.id).to.equal('03e85f06-2f5f-408e-a8fa-17cda0e66f3c');
      expect(response.total).to.equal(0);
    });
  });
});
