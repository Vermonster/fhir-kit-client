/* eslint-disable func-names, no-unused-expressions */

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

  describe('.splitReference', () => {
    const resourceType = 'Patient';
    const id = '1234';

    context('with an absolute reference', () => {
      const baseUrl = 'https://example.com/fhir';

      it('returns the baseUrl, resource type, and id', () => {
        const absoluteReference = `${baseUrl}/${resourceType}/${id}`;
        expect(Client.splitReference(absoluteReference).baseUrl).to.equal(baseUrl);
        expect(Client.splitReference(absoluteReference).resourceType).to.equal(resourceType);
        expect(Client.splitReference(absoluteReference).id).to.equal(id);
      });
    });

    context('with a relative reference', () => {
      it('returns the resource type and id', () => {
        const relativeReference = `${resourceType}/${id}`;
        expect(Client.splitReference(relativeReference).baseUrl).to.be.undefined;
        expect(Client.splitReference(relativeReference).resourceType).to.equal(resourceType);
        expect(Client.splitReference(relativeReference).id).to.equal(id);
      });
    });
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
        expect(response).to.be.undefined;
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
          expect(error.response.data.resourceType).to.deep.equal('OperationOutcome');
        }
        expect(response).to.be.undefined;
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

    it('can set the "Authorization" header to a Bearer token', async function () {
      this.fhirClient.bearerToken = 'XYZ';

      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .matchHeader('Authorization', 'Bearer XYZ')
        .get('/Patient/test-access-token')
        .reply(200, () => readStreamFor('patient.json'));

      await this.fhirClient.read({ resourceType: 'Patient', id: 'test-access-token' });
    });
  });

  describe('#resolve', async () => {
    context('with an absolute reference', () => {
      context('on the current FHIR server', () => {
        it('requests the resource from the FHIR server and returns it', async function () {
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

      context('on a different FHIR server', () => {
        it('requests the resource from the FHIR server and returns it', async function () {
          const baseUrl = 'https://www.example.org/fhir';
          const resourceType = 'Patient';
          const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';
          const reference = `${resourceType}/${id}`;
          const absoluteReference = `${baseUrl}/${reference}`;
          nock(baseUrl)
            .matchHeader('accept', 'application/json+fhir')
            .get(`/${reference}`)
            .reply(200, () => readStreamFor('patient.json'));

          const response = await this.fhirClient.resolve(absoluteReference);

          expect(response.resourceType).to.equal(resourceType);
          expect(response.id).to.equal(id);
        });
      });
    });

    context('with a relative reference', () => {
      it('requests the resource from baseUrl and returns it', async function () {
        const resourceType = 'Patient';
        const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';
        const reference = `${resourceType}/${id}`;
        nock(this.baseUrl)
          .matchHeader('accept', 'application/json+fhir')
          .get(`/${reference}`)
          .reply(200, () => readStreamFor('patient.json'));

        const response = await this.fhirClient.resolve(reference);

        expect(response.resourceType).to.equal(resourceType);
        expect(response.id).to.equal(id);
      });
    });

    context('with a contained reference', () => {
      it('returns the contained resource', async function () {
        const resource = JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/contained-resource.json`, 'utf8')));
        const reference = '#p1';

        const containedResource = await this.fhirClient.resolve(reference, resource);

        expect(containedResource.resourceType).to.equal('Practitioner');
        expect(containedResource.id).to.equal(reference.slice(1));
      });

      it('throws an error if the resource cannot be found', async function () {
        const resource = JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/contained-resource.json`, 'utf8')));
        const reference = '#p2';

        let containedResource;
        try {
          containedResource = await this.fhirClient.resolve(reference, resource);
        } catch (error) {
          expect(error.message).to.eql(`Unable to resolve contained reference: ${reference}`);
        }

        expect(containedResource).to.be.undefined;
      });
    });

    context('with a bundle', () => {
      const bundle = JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/bundle-references.json`, 'utf8')));

      context('when the resource exists in the bundle', () => {
        context('with an absolute reference', () => {
          it('returns the resource', async function () {
            const reference = 'https://example.com/fhir/Patient/23';

            const resource = await this.fhirClient.resolve(reference, bundle);

            expect(resource.resourceType).to.equal('Patient');
            expect(resource.id).to.equal('23');
          });
        });

        context('with a relative reference', () => {
          it('returns the resource', async function () {
            const reference = 'Patient/23';

            const resource = await this.fhirClient.resolve(reference, bundle);

            expect(resource.resourceType).to.equal('Patient');
            expect(resource.id).to.equal('23');
          });
        });

        context('with a uuid', () => {
          it('returns the resource', async function () {
            const uuid = '04121321-4af5-424c-a0e1-ed3aab1c349d';
            const reference = `urn:uuid:${uuid}`;

            const resource = await this.fhirClient.resolve(reference, bundle);

            expect(resource.resourceType).to.equal('Patient');
            expect(resource.id).to.equal(uuid);
          });
        });
      });

      context('when the resource is not in the bundle', () => {
        context('with an absolute reference', () => {
          it('requests the resource from the FHIR server and returns it', async function () {
            const reference = 'Patient/eb3271e1-ae1b-4644-9332-41e32c829486';
            const absoluteReference = `${this.baseUrl}/${reference}`;
            nock(this.baseUrl)
              .matchHeader('accept', 'application/json+fhir')
              .get(`/${reference}`)
              .reply(200, () => readStreamFor('patient.json'));

            const response = await this.fhirClient.resolve(absoluteReference, bundle);

            const { resourceType, id } = Client.splitReference(reference);
            expect(response.resourceType).to.equal(resourceType);
            expect(response.id).to.equal(id);
          });
        });

        context('with a relative reference', () => {
          it('requests the resource from baseUrl and returns it', async function () {
            const reference = 'Patient/eb3271e1-ae1b-4644-9332-41e32c829486';
            nock(this.baseUrl)
              .matchHeader('accept', 'application/json+fhir')
              .get(`/${reference}`)
              .reply(200, () => readStreamFor('patient.json'));

            const response = await this.fhirClient.resolve(reference, bundle);

            const { resourceType, id } = Client.splitReference(reference);
            expect(response.resourceType).to.equal(resourceType);
            expect(response.id).to.equal(id);
          });
        });
      });
    });
  });
});
