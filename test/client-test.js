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
  beforeEach(function () {
    const baseUrl = 'https://example.com';
    const config = { baseUrl };
    this.baseUrl = baseUrl;
    this.fhirClient = new Client(config);
  });

  it('initializes with config', function () {
    expect(this.fhirClient.baseUrl).to.equal(this.baseUrl);
  });

  describe('#smartAuthMetadata', () => {
    context('SMART URIs are not present', () => {
      it('returns an empty object', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/metadata')
          .reply(200, () => readStreamFor('no-smart-oauth-uri-capability-statement.json'));

        const authMetadata = await this.fhirClient.smartAuthMetadata();

        expect(authMetadata).to.deep.equal({});
      });
    });

    context('SMART URIs are present', () => {
      it('returns SMART OAuth URIs', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .matchHeader('Authorization', '')
          .get('/metadata')
          .reply(200, () => readStreamFor('valid-capability-statement.json'));

        const authMetadata = await this.fhirClient.smartAuthMetadata();

        expect(authMetadata).to.deep.equal({
          authorizeUrl: new URL('https://sb-auth.smarthealthit.org/authorize'),
          tokenUrl: new URL('https://sb-auth.smarthealthit.org/token'),
          registerUrl: new URL('https://sb-auth.smarthealthit.org/register'),
          launchRegisterUrl: new URL('https://sb-auth.smarthealthit.org/launch-registration'),
        });
      });
    });
  });

  describe('#capabilityStatement', () => {
    it('returns a FHIR resource', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/metadata')
        .reply(200, () => readStreamFor('no-smart-oauth-uri-capability-statement.json'));

      const capabilityStatement = await this.fhirClient.capabilityStatement();

      expect(capabilityStatement.resourceType).to.equal('CapabilityStatement');
    });
  });

  describe('API verbs', () => {
    describe('#read', () => {
      it('throws errors for a missing resource', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/abcdef')
          .reply(404, () => readStreamFor('patient-not-found.json'));

        let response;
        try {
          response = await this.fhirClient.read({ resourceType: 'Patient', id: 'abcdef' });
        } catch (error) {
          expect(error.response.status).to.equal(404);
          expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#vread', () => {
      it('returns a matching resource', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/eb3271e1-ae1b-4644-9332-41e32c829486/_history/1')
          .reply(200, () => readStreamFor('patient.json'));

        const response = await this.fhirClient.vread({ resourceType: 'Patient', id: 'eb3271e1-ae1b-4644-9332-41e32c829486', version: '1' });

        expect(response.resourceType).to.equal('Patient');
        expect(response.id).to.equal('eb3271e1-ae1b-4644-9332-41e32c829486');
      });

      it('throws errors for an absent resource', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/abcdef/_history/1')
          .reply(404, () => readStreamFor('patient-not-found.json'));

        let response;
        try {
          response = await this.fhirClient.vread({ resourceType: 'Patient', id: 'abcdef', version: '1' });
        } catch (error) {
          expect(error.response.status).to.equal(404);
          expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });

      it('throws errors for an absent version of an existing resource', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/eb3271e1-ae1b-4644-9332-41e32c829486/_history/2')
          .reply(404, () => readStreamFor('patient-version-not-found.json'));

        let response;
        try {
          response = await this.fhirClient.vread({ resourceType: 'Patient', id: 'eb3271e1-ae1b-4644-9332-41e32c829486', version: '2' });
        } catch (error) {
          expect(error.response.status).to.equal(404);
          expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#search', () => {
      it('returns a matching search results bundle', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient?name=abbott')
          .reply(200, () => readStreamFor('search-results.json'));

        const response = await this.fhirClient.search({ resourceType: 'Patient', searchParams: { name: 'abbott' } });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.id).to.equal('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
      });

      it('returns an empty search results bundle if no match is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient?name=abcdef')
          .reply(200, () => readStreamFor('empty-search-results.json'));

        const response = await this.fhirClient.search({ resourceType: 'Patient', searchParams: { name: 'abcdef' } });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.id).to.equal('03e85f06-2f5f-408e-a8fa-17cda0e66f3c');
        expect(response.total).to.equal(0);
      });
    });

    describe('#search-all', () => {
      it('returns a matching search results bundle', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('?name=abbott')
          .reply(200, () => readStreamFor('search-all-results.json'));

        const response = await this.fhirClient.searchAll({ searchParams: { name: 'abbott' } });

        expect(response.resourceType).to.equal('Bundle');
        // TODO
        expect(response.id).to.equal('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
      });

      it('returns an empty search results bundle if no match is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/?name=abcdef')
          .reply(200, () => readStreamFor('empty-search-all-results.json'));

        const response = await this.fhirClient.searchAll({ name: 'abcdef' } );

        expect(response.resourceType).to.equal('Bundle');
        // TODO
        expect(response.id).to.equal('03e85f06-2f5f-408e-a8fa-17cda0e66f3c');
        expect(response.total).to.equal(0);
      });
    });

    it('can set the "Authorization" header to a Bearer token', async function () {
      this.fhirClient.bearerToken = 'XYZ';

      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .matchHeader('Authorization', 'Bearer XYZ')
        .get('/Patient/test-access-token')
        .reply(200, () => readStreamFor('patient.json'));

      await this.fhirClient.read({ resourceType: 'Patient', id: 'test-access-token' });
    });

    describe('#create', () => {
      it('returns a successful operation outcome', async function () {
        const newPatient = {
          resourceType: 'Patient',
          active: true,
          name: [{ use: 'official', family: ['Coleman'], given: ['Lisa', 'P.'] }],
          gender: 'female',
          birthDate: '1948-04-14',
        };

        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .post('/Patient')
          .reply(201, () => readStreamFor('patient-created.json'));

        const response = await this.fhirClient.create({ resourceType: 'Patient', body: newPatient });

        expect(response.resourceType).to.deep.equal('OperationOutcome');
        expect(response.issue[0].diagnostics).to.have.string('Successfully created resource');
      });

      it('throws an error if the resource is not supported', async function () {
        const newRecord = {
          resourceType: 'Foo',
          name: [{ use: 'official', family: ['Coleman'], given: ['Lisa', 'P.'] }],
        };

        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .post('/Foo')
          .reply(400, () => readStreamFor('unknown-resource.json'));

        let response;
        try {
          response = await this.fhirClient.create({ resourceType: 'Foo', body: newRecord });
        } catch (error) {
          expect(error.response.status).to.eq(400);
          expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#delete', () => {
      it('returns a successful operation outcome', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .delete('/Patient/152746')
          .reply(200, () => readStreamFor('patient-deleted.json'));

        const response = await this.fhirClient.delete({ resourceType: 'Patient', id: 152746 });

        expect(response.resourceType).to.deep.equal('OperationOutcome');
        expect(response.issue[0].diagnostics).to.have.string('Successfully deleted 1 resource');
      });

      it('throws an error for a missing resource', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .delete('/Patient/abcdef')
          .reply(404, () => readStreamFor('patient-not-found.json'));

        let response;
        try {
          response = await this.fhirClient.delete({ resourceType: 'Patient', id: 'abcdef' });
        } catch (error) {
          expect(error.response.status).to.equal(404);
          expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#update', () => {
      const body = { resourceType: 'Patient', id: '152747', birthDate: '1948-10-10' };

      it('returns a successful operation outcome', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .put('/Patient/152747')
          .reply(200, () => readStreamFor('patient-updated.json'));

        const response = await this.fhirClient.update({ resourceType: 'Patient', id: '152747', body });

        expect(response.resourceType).to.deep.equal('OperationOutcome');
        expect(response.issue[0].diagnostics).to.have.string('_history/2');
      });

      it('throws an error for a missing resource', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .put('/Patient/abcdef')
          .reply(404, () => readStreamFor('patient-not-found.json'));

        let response;
        try {
          response = await this.fhirClient.update({ resourceType: 'Patient', id: 'abcdef', body });
        } catch (error) {
          expect(error.response.status).to.equal(404);
          expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#patch', () => {
      it('returns a successful operation outcome', async function () {
        // Content-Type is 'application/json-patch+json'
        // http://hl7.org/fhir/STU3/http.html#patch
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .matchHeader('content-type', 'application/json-patch+json')
          .patch('/Patient/152747')
          .reply(200, () => readStreamFor('patient-patched.json'));

        // Format described in http://jsonpatch.com/
        const jsonPatch = [{ op: 'replace', path: '/gender', value: 'male' }];
        const response = await this.fhirClient.patch({ resourceType: 'Patient', id: '152747', body: jsonPatch });

        expect(response.resourceType).to.deep.equal('OperationOutcome');
        expect(response.issue[0].diagnostics).to.have.string('_history/3');
      });

      it('throws an error when given an invalid patch', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .matchHeader('content-type', 'application/json-patch+json')
          .patch('/Patient/152747')
          .reply(500, () => readStreamFor('patient-not-patched.json'));

        // Accepted values for gender: male, female, unknown
        const invalidPatch = [{ op: 'replace', path: '/gender', value: 0 }];
        let response;
        try {
          response = await this.fhirClient.patch({ resourceType: 'Patient', id: '152747', body: invalidPatch });
        } catch (error) {
          expect(error.response.status).to.equal(500);
          expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#history', () => {
      it('returns a history bundle for a resource', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .history('/Patient/52747/_history')
          .reply(200, () => readStreamFor('patient-history.json'));

        const response = await this.fhirClient.history({ resourceType: 'Patient', id: '152747' });

        expect(response.resourceType).to.deep.equal('Bundle');
        // TODO
        expect(response.issue[0].diagnostics).to.have.string('_history/3');
      });

      it('returns an empty history bundle if none is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .history('/Patient/abcde/_history')
          // TODO
          .reply(500, () => readStreamFor('patient-history-not-found.json'));

        let response;
        try {
          response = await this.fhirClient.history({ resourceType: 'Patient', id: 'abcde' });
        } catch (error) {
          expect(error.response.status).to.equal(500);
          //TODO
          expect(error.response.data.resourceType).to.deep.equal('Bundle');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#history-type', () => {
      it('returns a history bundle for a resource type', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .patch('/Patient/_history')
          .reply(200, () => readStreamFor('patient-type-history.json'));

        const response = await this.fhirClient.historyType({ resourceType: 'Patient' });

        expect(response.resourceType).to.deep.equal('Bundle');
        // TODO
        expect(response.issue[0].diagnostics).to.have.string('_history/3');
      });

      it('returns an empty history bundle if none is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .history('/Patient/_history')
          // TODO
          .reply(500, () => readStreamFor('patient-type-history-not-found.json'));

        let response;
        try {
          response = await this.fhirClient.history('/Patient/_history');
        } catch (error) {
          expect(error.response.status).to.equal(500);
          //TODO
          expect(error.response.data.resourceType).to.deep.equal('Bundle');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#history-all', () => {
      it('returns a history bundle for all resources', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .history-all('_history')
          .reply(200, () => readStreamFor('all-history.json'));

        const response = await this.fhirClient.history-all('_/history');

        expect(response.resourceType).to.deep.equal('Bundle');
        expect(response.type).to.deep.equal('history');
        expect(response.total).to.deep.equal('152750');
      });

      it('returns an empty history bundle if none is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .history-all('_history')
          .reply(500, () => readStreamFor('no-history-found.json'));

        let response;
        try {
          response = await this.fhirClient.history-all('_history');
        } catch (error) {
          expect(error.response.status).to.equal(500);
          expect(error.response.data.resourceType).to.deep.equal('Bundle');
          expect(error.response.data.type).to.deep.equal('history');
          expect(error.response.data.total).to.deep.equal('0');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });
  });
});
