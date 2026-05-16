import { describe, expect, it } from 'vitest';
import { createQueryString, splitReference, validResourceType } from '../src/utils.js';

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

  describe('validResourceType', () => {
    it('returns true for a valid resource type', () => {
      expect(validResourceType('Patient')).toBe(true);
      expect(validResourceType('MedicationRequest')).toBe(true);
    });

    it('returns false for null', () => {
      expect(validResourceType(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(validResourceType(undefined)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(validResourceType('')).toBe(false);
    });

    it('returns false for a whitespace-only string', () => {
      expect(validResourceType('   ')).toBe(false);
    });

    it('returns false for a string with a leading slash', () => {
      expect(validResourceType('/Patient')).toBe(false);
    });

    it('returns false for a URL (contains colon)', () => {
      expect(validResourceType('http://example.com/Patient')).toBe(false);
      expect(validResourceType('https://bad/Patient')).toBe(false);
    });
  });

  describe('createQueryString', () => {
    it('returns undefined for undefined input', () => {
      expect(createQueryString(undefined)).toBeUndefined();
    });

    it('returns undefined for an empty object', () => {
      expect(createQueryString({})).toBeUndefined();
    });

    it('serializes a single scalar param', () => {
      expect(createQueryString({ name: 'john' })).toBe('name=john');
    });

    it('serializes multiple scalar params', () => {
      const result = createQueryString({ name: 'john', age: 30, active: true });
      expect(result).toContain('name=john');
      expect(result).toContain('age=30');
      expect(result).toContain('active=true');
    });

    it('serializes an array param as repeated keys', () => {
      expect(createQueryString({ _include: ['Observation', 'MedicationRequest'] })).toBe(
        '_include=Observation&_include=MedicationRequest',
      );
    });

    it('serializes a mix of scalar and array params', () => {
      const result = createQueryString({ category: 'problem', _include: ['Obs', 'Med'] });
      expect(result).toContain('category=problem');
      expect(result).toContain('_include=Obs');
      expect(result).toContain('_include=Med');
    });
  });
});
