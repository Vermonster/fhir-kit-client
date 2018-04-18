/* eslint-disable func-names, no-unused-expressions */
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { expect } = require('chai');
const nock = require('nock');

const Client = require('../lib/client');
const Pagination = require('../lib/pagination');

/**
 * Read fixture data
 *
 * @param {String} fixture - The fixture file
 *
 * @returns {String} - The data from a fixture
 */
function readStreamFor(fixture) {
  return fs.createReadStream(path.normalize(`${__dirname}/fixtures/${fixture}`, 'utf8'));
}

function readFixture(filename) {
  return JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/${filename}`, 'utf8')));
}

/**
 * Mock out and assert behavior for client verbs without passing params
 *
 * @param {String} httpVerb - The HTTP verb to mock
 * @param {String} apiVerb - The verb to call on the client
 *
 * @return {Object} - The nock scope
 */
const mockAndExpectNotFound = async function (httpVerb, apiVerb) {
  const scope = nock('http://example.com')
    .matchHeader('accept', 'application/json+fhir');

  switch (httpVerb) {
    case 'get':
      scope.get(/undefined.*/).reply(404);
      break;
    case 'post':
      scope.post(/.*/).reply(404);
      break;
    case 'delete':
      scope.delete(/.*/).reply(404);
      break;
    case 'put':
      scope.put(/.*/).reply(404);
      break;
    case 'patch':
      scope.patch(/.*/).reply(404);
      break;
    default:
      break;
  }

  if (apiVerb === 'search') {
    scope.get(/.*/).reply(404);
  }

  const client = new Client({ baseUrl: 'http://example.com' });
  let response;

  try {
    response = await client[apiVerb]();
  } catch (error) {
    expect(error.response.status).to.equal(404);
  }

  expect(response).to.be.undefined;
};

const expectHistoryBundle = function (response, total) {
  expect(response.resourceType).to.equal('Bundle');
  expect(response.type).to.equal('history');
  expect(response.total).to.equal(total);
};

describe('Client', function () {
  beforeEach(function () {
    const baseUrl = 'https://example.com';
    const config = { baseUrl };
    this.baseUrl = baseUrl;
    this.fhirClient = new Client(config);
  });

  it('initializes without config', function () {
    expect(new Client()).to.exist;
  });

  it('initializes with config', function () {
    expect(this.fhirClient.baseUrl).to.equal(this.baseUrl);
    expect(this.fhirClient.pagination).to.be.an.instanceof(Pagination);
  });

  describe('#smartAuthMetadata', function () {
    context('SMART URIs are not present', function () {
      it('returns an empty object', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/metadata')
          .reply(200, () => readStreamFor('no-smart-oauth-uri-capability-statement.json'));

        const authMetadata = await this.fhirClient.smartAuthMetadata();

        expect(authMetadata).to.deep.equal({});
      });
    });

    context('SMART URIs are present', function () {
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
          manageUrl: new URL('https://sb-auth.smarthealthit.org/manage'),
        });
      });
    });
  });

  describe('#capabilityStatement', function () {
    it('returns a FHIR resource from the FHIR server if metadata is not present', async function () {
      const scope = nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/metadata')
        .reply(200, () => readStreamFor('no-smart-oauth-uri-capability-statement.json'));

      const capabilityStatement = await this.fhirClient.capabilityStatement();

      // The metadata returns as expected after hitting the FHIR server.
      expect(scope.activeMocks()).to.be.empty;
      expect(capabilityStatement.resourceType).to.equal('CapabilityStatement');
    });

    it('returns a FHIR resource from the FHIR client if metadata is already present', async function () {
      const scope = nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/metadata')
        .reply(200, () => readStreamFor('no-smart-oauth-uri-capability-statement.json'));

      this.fhirClient.metadata = readFixture('no-smart-oauth-uri-capability-statement.json');

      const capabilityStatement = await this.fhirClient.capabilityStatement();

      // The metadata returns as expected without hitting the FHIR server.
      expect(scope.activeMocks()).to.contain('GET https://example.com:443/metadata');
      expect(capabilityStatement.resourceType).to.equal('CapabilityStatement');
    });
  });

  describe('#resolve', async function () {
    it('resolves a reference and returns a resource', async function () {
      const resourceType = 'Patient';
      const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';
      const reference = `${resourceType}/${id}`;
      const absoluteReference = `${this.baseUrl}/${reference}`;
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get(`/${reference}`)
        .reply(200, () => readStreamFor('patient.json'));

      const response = await this.fhirClient.resolve(absoluteReference);

      expect(response.resourceType).to.equal(resourceType);
      expect(response.id).to.equal(id);
    });
  });

  describe('Authorization header', function () {
    describe('#read', function () {
      it('sets the header to a Bearer token', async function () {
        this.fhirClient.bearerToken = 'XYZ';

        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .matchHeader('Authorization', 'Bearer XYZ')
          .get('/Patient/test-access-token')
          .reply(200, () => readStreamFor('patient.json'));

        await this.fhirClient.read({ resourceType: 'Patient', id: 'test-access-token' });
      });
    });
  });

  describe('API verbs', function () {
    describe('#read', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('get', 'read');
      });

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
          expect(error.response.data.resourceType).to.equal('OperationOutcome');
        }
        expect(response).to.be.undefined;
      });
    });

    describe('#vread', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('get', 'vread');
      });

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
          expect(error.response.data.resourceType).to.equal('OperationOutcome');
        }
        expect(response).to.be.undefined;
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
          expect(error.response.data.resourceType).to.equal('OperationOutcome');
        }
        expect(response).to.be.undefined;
      });
    });

    describe('#search', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('get', 'search');
      });

      it('calls compartmentSearch when given a "compartment" param', async function () {
        this.fhirClient.compartmentSearch = async function () {
          return 'compartment';
        };

        const level = await this.fhirClient.search({
          resourceType: 'Condition',
          compartment: { resourceType: 'Patient', id: 123 },
          searchParams: { category: 'problem' },
        });

        expect(level).to.eq('compartment');
      });

      it('calls resourceSearch when given "resourceType" but not a "compartment" param', async function () {
        this.fhirClient.resourceSearch = async function () {
          return 'resource';
        };

        const level = await this.fhirClient.search({ resourceType: 'Patient', searchParams: { name: 'abbott' } });

        expect(level).to.eq('resource');
      });

      it('calls systemSearch when missing both "resourceType" and "compartment" params', async function () {
        this.fhirClient.systemSearch = async function () {
          return 'system';
        };

        const level = await this.fhirClient.search({ searchParams: { name: 'abbott' } });

        expect(level).to.eq('system');
      });
    });

    describe('#resourceSearch', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('get', 'resourceSearch');
      });

      it('returns a matching search results bundle', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient?name=abbott')
          .reply(200, () => readStreamFor('search-results.json'));

        const response = await this.fhirClient.resourceSearch({
          resourceType: 'Patient',
          searchParams: { name: 'abbott' },
        });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.id).to.equal('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
      });

      it('returns an empty search results bundle if no match is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient?name=abcdef')
          .reply(200, () => readStreamFor('empty-resource-search-results.json'));

        const response = await this.fhirClient.resourceSearch({
          resourceType: 'Patient',
          searchParams: { name: 'abcdef' },
        });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.id).to.equal('03e85f06-2f5f-408e-a8fa-17cda0e66f3c');
        expect(response.total).to.equal(0);
      });
    });

    describe('#systemSearch', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('get', 'systemSearch');
      });

      it('returns a matching search results bundle', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/_search?name=abcdef')
          .reply(200, () => readStreamFor('system-search-results.json'));

        const response = await this.fhirClient.systemSearch({ searchParams: { name: 'abcdef' } });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.id).to.equal('95a2de95-08c7-418e-b4d0-2dd6fc8cc37e');
      });

      it('returns an empty search results bundle if nothing is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/_search?name=abcdef')
          .reply(200, () => readStreamFor('empty-system-search-results.json'));

        const response = await this.fhirClient.systemSearch({ searchParams: { name: 'abcdef' } });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.id).to.equal('03e85f06-2f5f-408e-a8fa-17cda0e66f3c');
        expect(response.total).to.equal(0);
      });
    });

    describe('#compartmentSearch', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('get', 'compartmentSearch');
      });

      it('returns a matching search results bundle', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/385800201/Condition?category=problem')
          .reply(200, () => readStreamFor('compartment-search-results.json'));

        const response = await this.fhirClient.compartmentSearch({
          compartment: { resourceType: 'Patient', id: 385800201 },
          resourceType: 'Condition',
          searchParams: { category: 'problem' },
        });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.type).to.equal('searchset');
        expect(response.total).to.equal(6);
      });

      it('returns an empty search results bundle if nothing is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/385800201/Condition?category=foo')
          .reply(200, () => readStreamFor('empty-compartment-search-results.json'));

        const response = await this.fhirClient.compartmentSearch({
          compartment: { resourceType: 'Patient', id: 385800201 },
          resourceType: 'Condition',
          searchParams: { category: 'foo' },
        });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.type).to.equal('searchset');
        expect(response.total).to.equal(0);
      });
    });

    describe('pagination', function () {
      describe('#nextPage', function () {
        it('returns httpClient get for the next link', async function () {
          nock(this.baseUrl)
            .matchHeader('accept', 'application/json+fhir')
            .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3&_pretty=true&_bundletype=searchset')
            .reply(200, () => readStreamFor('search-results-page-2.json'));

          const searchResults = readFixture('search-results-page-1.json');
          const response = await this.fhirClient.nextPage(searchResults);
          const url = 'https://example.com/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3&_pretty=true&_bundletype=searchset';

          expect(response.link[0].url).to.equal(url);
        });

        it('returns undefined if no next page exists', function () {
          const results = readFixture('search-results.json');

          expect(this.fhirClient.nextPage(results)).to.equal(undefined);
        });
      });

      describe('#prevPage', function () {
        it('returns httpClient get for the previous link', async function () {
          nock(this.baseUrl)
            .matchHeader('accept', 'application/json+fhir')
            .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=0&_count=3&_pretty=true&_bundletype=searchset')
            .reply(200, () => readStreamFor('search-results-page-1.json'));

          const searchResults = readFixture('search-results-page-2.json');
          const response = await this.fhirClient.prevPage(searchResults);
          const url = 'https://example.com/Patient?_count=3&gender=female';

          expect(response.link[0].url).to.equal(url);
        });

        it('returns undefined if no previous page exists', function () {
          const results = readFixture('search-results.json');
          expect(this.fhirClient.prevPage(results)).to.equal(undefined);
        });

        it('detects and responds to "prev" relations', async function () {
          nock(this.baseUrl)
            .matchHeader('accept', 'application/json+fhir')
            .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=0&_count=3&_pretty=true&_bundletype=searchset')
            .reply(200, () => readStreamFor('search-results-page-1.json'));

          const searchResults = readFixture('search-results-page-2.json');
          searchResults.link[2].relation = 'prev';
          const response = await this.fhirClient.prevPage(searchResults);
          const url = 'https://example.com/Patient?_count=3&gender=female';

          expect(response.link[0].url).to.equal(url);
        });
      });
    });

    describe('#create', function () {
      it('create builds request with no arguments', async function () {
        mockAndExpectNotFound('post', 'create');
      });

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

        const response = await this.fhirClient.create({
          resourceType: newPatient.resourceType,
          resource: newPatient,
        });

        expect(response.resourceType).to.equal('OperationOutcome');
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
          response = await this.fhirClient.create({
            resourceType: newRecord.resourceType,
            resource: newRecord,
          });
        } catch (error) {
          expect(error.response.status).to.eq(400);
          expect(error.response.data.resourceType).to.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#delete', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('delete', 'delete');
      });

      it('returns a successful operation outcome', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .delete('/Patient/152746')
          .reply(200, () => readStreamFor('patient-deleted.json'));

        const response = await this.fhirClient.delete({ resourceType: 'Patient', id: 152746 });

        expect(response.resourceType).to.equal('OperationOutcome');
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
          expect(error.response.data.resourceType).to.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#update', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('put', 'update');
      });

      const body = { resourceType: 'Patient', id: '152747', birthDate: '1948-10-10' };

      it('returns a successful operation outcome', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .put('/Patient/152747')
          .reply(200, () => readStreamFor('patient-updated.json'));

        const response = await this.fhirClient.update({ resourceType: 'Patient', id: '152747', body });

        expect(response.resourceType).to.equal('OperationOutcome');
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
          expect(error.response.data.resourceType).to.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#patch', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('patch', 'patch');
      });

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

        expect(response.resourceType).to.equal('OperationOutcome');
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
          expect(error.response.data.resourceType).to.equal('OperationOutcome');
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

    describe('#batch', () => {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('post', 'batch');
      });

      it('returns a matching batch response bundle', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .post('/')
          .reply(200, () => readStreamFor('batch-results.json'));

        const body = readFixture('batch-request.json');
        const response = await this.fhirClient.batch({ body });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.type).to.equal('batch-response');
        expect(response.entry[0].resource.resourceType).to.equal('OperationOutcome');
        expect(response.entry[0].resource.text.status).to.equal('generated');
        expect(response.entry[1].response.status).to.equal('201 Created');
        expect(response.entry[2].response.status).to.equal('200 OK');
        expect(response.entry[3].response.status).to.equal('204 No Content');
        expect(response.entry[4].response.status).to.equal('200 OK');
        expect(response.entry[4].resource.resourceType).to.equal('Bundle');
      });

      it('returns a bundle of errors if any operations are unsuccessful', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .post('/')
          .reply(200, () => readStreamFor('batch-error-results.json'));

        const body = readFixture('batch-error-request.json');
        const response = await this.fhirClient.batch({ body });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.type).to.equal('batch-response');
        expect(response.entry[0].resource.resourceType).to.equal('OperationOutcome');
        expect(response.entry[0].resource.text.status).to.equal('generated');
        expect(response.entry[1].response.status).to.equal('500 Internal Server Error');
        expect(response.entry[2].response.status).to.equal('500 Internal Server Error');
        expect(response.entry[3].response.status).to.equal('404 Not Found');
        // A search operation yielding zero results returns an empty bundle despite failures
        expect(response.entry[4].response.status).to.equal('200 OK');
        expect(response.entry[4].resource.resourceType).to.equal('Bundle');
      });
    });

    describe('#transaction', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('post', 'transaction');
      });

      it('returns a transaction response bundle with matching response statuses', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .post('/')
          .reply(200, () => readStreamFor('transaction-results.json'));

        const body = readFixture('transaction-request.json');
        const response = await this.fhirClient.transaction({ body });

        expect(response.resourceType).to.equal('Bundle');
        expect(response.type).to.equal('transaction-response');
        expect(response.entry[0].response.status).to.equal('201 Created');
        expect(response.entry[1].response.status).to.equal('200 OK');
        expect(response.entry[2].response.status).to.equal('204 No Content');
        expect(response.entry[3].response.status).to.equal('200 OK');
        expect(response.entry[3].resource.resourceType).to.equal('Bundle');
      });

      it('throws an error if any operations are unsuccessful', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .post('/')
          .reply(404, () => readStreamFor('transaction-error-response.json'));

        const body = readFixture('transaction-error-request.json');

        let response;
        try {
          response = await this.fhirClient.transaction({ body });
        } catch (error) {
          expect(error.response.status).to.equal(404);
          expect(error.response.data.resourceType).to.equal('OperationOutcome');
        }
        expect(response).to.be.undefined; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#history', function () {
      it('calls resourceHistory when given the "resourceType" and "id" params', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/152747/_history')
          .reply(200);

        const level = await this.fhirClient.history({ resourceType: 'Patient', id: '152747' });

        expect(level).to.eq('resource');
      });

      it('calls typeHistory when given the "resourceType" but not the "id" param', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/_history')
          .reply(200);

        const level = await this.fhirClient.history({ resourceType: 'Patient' });

        expect(level).to.eq('type');
      });

      it('calls systemHistory when given no arguments', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/_history')
          .reply(200);

        const level = await this.fhirClient.history();

        expect(level).to.eq('system');
      });
    });

    describe('#resourceHistory', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('get', 'resourceHistory');
      });

      it('returns a history bundle for a resource', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/152747/_history')
          .reply(200, () => readStreamFor('resource-history.json'));

        const response = await this.fhirClient.resourceHistory({ resourceType: 'Patient', id: '152747' });

        expectHistoryBundle(response, 20);
      });

      it('returns an empty history bundle if no update to the resource is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/abcde/_history')
          .reply(200, () => readStreamFor('empty-resource-history.json'));

        const response = await this.fhirClient.resourceHistory({ resourceType: 'Patient', id: 'abcde' });

        expectHistoryBundle(response, 0);
      });
    });

    describe('#typeHistory', function () {
      it('builds request with no arguments', async function () {
        mockAndExpectNotFound('get', 'typeHistory');
      });

      it('returns a history bundle for a resource type', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/_history')
          .reply(200, () => readStreamFor('type-history.json'));

        const response = await this.fhirClient.typeHistory({ resourceType: 'Patient' });

        expectHistoryBundle(response, 15);
      });

      it('returns an empty history bundle if no update to resource type is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/Patient/_history')
          .reply(200, () => readStreamFor('empty-type-history.json'));

        const response = await this.fhirClient.typeHistory({ resourceType: 'Patient' });

        expectHistoryBundle(response, 0);
      });
    });

    describe('#systemHistory', function () {
      it('returns a history bundle for all resources', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/_history')
          .reply(200, () => readStreamFor('system-history.json'));

        const response = await this.fhirClient.systemHistory('_/history');

        expectHistoryBundle(response, 152750);
      });

      it('returns an empty history bundle if no update to the system is found', async function () {
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get('/_history')
          .reply(200, () => readStreamFor('empty-system-history.json'));

        const response = await this.fhirClient.systemHistory('_/history');

        expectHistoryBundle(response, 0);
      });
    });
  });
});
