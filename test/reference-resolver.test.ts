import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { Client } from '../src/client.js';
import { ReferenceResolver } from '../src/reference-resolver.js';
import { splitReference } from '../src/utils.js';
import { server } from './setup.js';
import { readFixture } from './test-utils.js';

const BASE_URL = 'https://example.com';

describe('ReferenceResolver', () => {
  let fhirClient: Client;
  let resolver: ReferenceResolver;

  beforeEach(() => {
    fhirClient = new Client({ baseUrl: BASE_URL });
    resolver = new ReferenceResolver(fhirClient);
  });

  describe('resolve', () => {
    describe('with an absolute reference', () => {
      describe('on the current FHIR server', () => {
        it('requests the resource from the FHIR server and returns it', async () => {
          const resourceType = 'Patient';
          const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';
          const reference = `${resourceType}/${id}`;
          const absoluteReference = `${BASE_URL}/${reference}`;
          const patient = readFixture('patient.json');

          server.use(http.get(`${BASE_URL}/${reference}`, () => HttpResponse.json(patient)));

          const response = await resolver.resolve({ reference: absoluteReference });
          expect(response.resourceType).toBe(resourceType);
          expect(response.id).toBe(id);
        });
      });

      describe('on a different FHIR server', () => {
        it('requests the resource from the correct FHIR server and returns it', async () => {
          const altBase = 'https://www.example.org/fhir';
          const resourceType = 'Patient';
          const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';
          const reference = `${resourceType}/${id}`;
          const absoluteReference = `${altBase}/${reference}`;
          const patient = readFixture('patient.json');

          server.use(http.get(`${altBase}/${reference}`, () => HttpResponse.json(patient)));

          const response = await resolver.resolve({ reference: absoluteReference });
          expect(response.resourceType).toBe(resourceType);
          expect(response.id).toBe(id);
        });
      });
    });

    describe('with a relative reference', () => {
      it('requests the resource from baseUrl and returns it', async () => {
        const resourceType = 'Patient';
        const id = 'eb3271e1-ae1b-4644-9332-41e32c829486';
        const reference = `${resourceType}/${id}`;
        const patient = readFixture('patient.json');

        server.use(http.get(`${BASE_URL}/${reference}`, () => HttpResponse.json(patient)));

        const response = await resolver.resolve({ reference });
        expect(response.resourceType).toBe(resourceType);
        expect(response.id).toBe(id);
      });
    });

    describe('with a contained reference', () => {
      it('returns the contained resource', async () => {
        const context = readFixture('contained-resource.json');
        const reference = '#p1';

        const containedResource = await resolver.resolve({ reference, context });
        expect(containedResource.resourceType).toBe('Practitioner');
        expect(containedResource.id).toBe('p1');
      });

      it('throws an error if the contained resource cannot be found', async () => {
        const context = readFixture('contained-resource.json');
        const reference = '#p2';

        await expect(resolver.resolve({ reference, context })).rejects.toThrow(
          `Unable to resolve contained reference: ${reference}`,
        );
      });
    });

    describe('with a bundle context', () => {
      const bundle = readFixture('bundle-references.json');

      describe('when the resource exists in the bundle', () => {
        it('returns the resource for an absolute reference', async () => {
          const reference = 'https://example.com/fhir/Patient/23';
          const resource = await resolver.resolve({ reference, context: bundle });
          expect(resource.resourceType).toBe('Patient');
          expect(resource.id).toBe('23');
        });

        it('returns the resource for a relative reference', async () => {
          const reference = 'Patient/23';
          const resource = await resolver.resolve({ reference, context: bundle });
          expect(resource.resourceType).toBe('Patient');
          expect(resource.id).toBe('23');
        });

        it('returns the resource for a urn:uuid reference', async () => {
          const uuid = '04121321-4af5-424c-a0e1-ed3aab1c349d';
          const reference = `urn:uuid:${uuid}`;
          const resource = await resolver.resolve({ reference, context: bundle });
          expect(resource.resourceType).toBe('Patient');
          expect(resource.id).toBe(uuid);
        });
      });

      describe('when the resource is not in the bundle', () => {
        it('fetches an absolute reference from the FHIR server', async () => {
          const reference = 'Patient/eb3271e1-ae1b-4644-9332-41e32c829486';
          const absoluteReference = `${BASE_URL}/${reference}`;
          const patient = readFixture('patient.json');

          server.use(http.get(`${BASE_URL}/${reference}`, () => HttpResponse.json(patient)));

          const response = await resolver.resolve({ reference: absoluteReference, context: bundle });
          const { resourceType, id } = splitReference(reference);
          expect(response.resourceType).toBe(resourceType);
          expect(response.id).toBe(id);
        });

        it('fetches a relative reference from the FHIR server', async () => {
          const reference = 'Patient/eb3271e1-ae1b-4644-9332-41e32c829486';
          const patient = readFixture('patient.json');

          server.use(http.get(`${BASE_URL}/${reference}`, () => HttpResponse.json(patient)));

          const response = await resolver.resolve({ reference, context: bundle });
          const { resourceType, id } = splitReference(reference);
          expect(response.resourceType).toBe(resourceType);
          expect(response.id).toBe(id);
        });
      });
    });
  });
});
