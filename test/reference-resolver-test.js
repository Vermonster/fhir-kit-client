/* eslint-disable func-names, no-unused-expressions */

const fs = require('fs');
const path = require('path');

const { expect } = require('chai');
const nock = require('nock');

const { splitReference } = require('../lib/utils');
const Client = require('../lib/client');
const ReferenceResolver = require('../lib/reference-resolver');

function readStreamFor(fixture) {
  return fs.createReadStream(path.normalize(`${__dirname}/fixtures/${fixture}`, 'utf8'));
}

describe('ReferenceResolver', () => {
  beforeEach(function () {
    const baseUrl = 'https://example.com';
    const config = { baseUrl };
    this.baseUrl = baseUrl;
    this.fhirClient = new Client(config);
    this.resolver = new ReferenceResolver(this.fhirClient);
  });

  describe('#resolve', () => {
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

          const response = await this.resolver.resolve(absoluteReference);

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

          const response = await this.resolver.resolve(absoluteReference);

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

        const response = await this.resolver.resolve(reference);

        expect(response.resourceType).to.equal(resourceType);
        expect(response.id).to.equal(id);
      });
    });

    context('with a contained reference', () => {
      it('returns the contained resource', async function () {
        const resource = JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/contained-resource.json`, 'utf8')));
        const reference = '#p1';

        const containedResource = await this.resolver.resolve(reference, resource);

        expect(containedResource.resourceType).to.equal('Practitioner');
        expect(containedResource.id).to.equal(reference.slice(1));
      });

      it('throws an error if the resource cannot be found', async function () {
        const resource = JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/contained-resource.json`, 'utf8')));
        const reference = '#p2';

        let containedResource;
        try {
          containedResource = await this.resolver.resolve(reference, resource);
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

            const resource = await this.resolver.resolve(reference, bundle);

            expect(resource.resourceType).to.equal('Patient');
            expect(resource.id).to.equal('23');
          });
        });

        context('with a relative reference', () => {
          it('returns the resource', async function () {
            const reference = 'Patient/23';

            const resource = await this.resolver.resolve(reference, bundle);

            expect(resource.resourceType).to.equal('Patient');
            expect(resource.id).to.equal('23');
          });
        });

        context('with a uuid', () => {
          it('returns the resource', async function () {
            const uuid = '04121321-4af5-424c-a0e1-ed3aab1c349d';
            const reference = `urn:uuid:${uuid}`;

            const resource = await this.resolver.resolve(reference, bundle);

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

            const response = await this.resolver.resolve(absoluteReference, bundle);

            const { resourceType, id } = splitReference(reference);
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

            const response = await this.resolver.resolve(reference, bundle);

            const { resourceType, id } = splitReference(reference);
            expect(response.resourceType).to.equal(resourceType);
            expect(response.id).to.equal(id);
          });
        });
      });
    });
  });
});
