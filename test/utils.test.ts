import { describe, expect, it } from 'vitest';
import { splitReference } from '../src/utils.js';

describe('utils', () => {
  describe('splitReference', () => {
    const baseUrl = 'https://www.example.com/fhir';
    const id = '1234';

    describe('with an absolute reference', () => {
      it('returns baseUrl, resource type, and id for R4 references', () => {
        const resourceType = 'MedicationKnowledge';
        const ref = `${baseUrl}/${resourceType}/${id}`;
        const result = splitReference(ref);
        expect(result.baseUrl).toBe(baseUrl);
        expect(result.resourceType).toBe(resourceType);
        expect(result.id).toBe(id);
      });

      it('returns baseUrl, resource type, and id for STU3 references', () => {
        const resourceType = 'MedicationRequest';
        const ref = `${baseUrl}/${resourceType}/${id}`;
        const result = splitReference(ref);
        expect(result.baseUrl).toBe(baseUrl);
        expect(result.resourceType).toBe(resourceType);
        expect(result.id).toBe(id);
      });

      it('returns baseUrl, resource type, and id for DSTU2 references', () => {
        const resourceType = 'MedicationOrder';
        const ref = `${baseUrl}/${resourceType}/${id}`;
        const result = splitReference(ref);
        expect(result.baseUrl).toBe(baseUrl);
        expect(result.resourceType).toBe(resourceType);
        expect(result.id).toBe(id);
      });
    });

    describe('with a relative reference', () => {
      it('returns resource type and id without baseUrl', () => {
        const resourceType = 'Patient';
        const ref = `${resourceType}/${id}`;
        const result = splitReference(ref);
        expect(result.baseUrl).toBeUndefined();
        expect(result.resourceType).toBe(resourceType);
        expect(result.id).toBe(id);
      });
    });

    describe('with an invalid reference', () => {
      it('throws an error', () => {
        const resourceType = 'Patent'; // intentional misspelling
        const ref = `${baseUrl}/${resourceType}/${id}`;
        expect(() => splitReference(ref)).toThrow(`${ref} is not a recognized FHIR reference`);
      });
    });
  });
});
