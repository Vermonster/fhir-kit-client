import { describe, it, expect, beforeEach } from 'vitest';
import { readFixture } from './test-utils.js';
import { CapabilityTool } from '../src/capability-tool.js';

describe('CapabilityTool', () => {
  let capabilities: CapabilityTool;

  beforeEach(() => {
    const capabilityStatement = readFixture('valid-capability-statement.json');
    capabilities = new CapabilityTool(capabilityStatement);
  });

  describe('serverCan', () => {
    it('returns true when a server interaction is supported', () => {
      expect(capabilities.serverCan('batch')).toBe(true);
    });

    it('returns false when a server interaction is not supported', () => {
      expect(capabilities.serverCan('transaction')).toBe(false);
    });
  });

  describe('resourceCan', () => {
    it('returns true when a resource interaction is supported', () => {
      expect(capabilities.resourceCan('Patient', 'read')).toBe(true);
    });

    it('returns false when a resource interaction is not supported', () => {
      expect(capabilities.resourceCan('Patient', 'foo')).toBe(false);
    });
  });

  describe('serverSearch', () => {
    it('returns true when a server-level search parameter is supported', () => {
      expect(capabilities.serverSearch('_text')).toBe(true);
    });

    it('returns false when a server-level search parameter is not supported', () => {
      expect(capabilities.serverSearch('_tag')).toBe(false);
    });
  });

  describe('resourceSearch', () => {
    it('returns true when a resource-level search parameter is supported', () => {
      expect(capabilities.resourceSearch('Patient', 'gender')).toBe(true);
    });

    it('returns false when a resource-level search parameter is not supported', () => {
      expect(capabilities.serverSearch('foo')).toBe(false);
    });
  });

  describe('supportFor', () => {
    it('returns false when no arguments are passed', () => {
      expect(capabilities.supportFor()).toBe(false);
    });

    it('returns true when a resource-level interaction capability is in the capability statement', () => {
      expect(capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'interaction', where: { code: 'read' } })).toBe(true);
    });

    it('returns false when a resource-level interaction capability is not in the capability statement', () => {
      expect(capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'interaction', where: { code: 'foo' } })).toBe(false);
    });

    it('returns true when a resource-level capability is in the capability statement', () => {
      expect(capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'conditionalCreate' })).toBe(true);
    });

    it('returns true when a resource-level search param capability is in the capability statement', () => {
      expect(capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'searchParam', where: { name: 'birthdate' } })).toBe(true);
    });

    it('returns false when a resource-level search param capability is not in the capability statement', () => {
      expect(capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'searchParam', where: { name: 'foo' } })).toBe(false);
    });

    it('returns true when a resource-level conditional delete capability is in the capability statement', () => {
      expect(capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'conditionalDelete' })).toBe(true);
    });

    it('returns false when a resource is not in the capability statement', () => {
      expect(capabilities.supportFor({ resourceType: 'Foo', capabilityType: 'interactions' })).toBe(false);
    });

    it('returns false when a server-level capability is not supported', () => {
      expect(capabilities.supportFor({ capabilityType: 'foo' })).toBe(false);
    });

    it('returns true when a server-level capability is supported', () => {
      expect(capabilities.supportFor({ capabilityType: 'interaction' })).toBe(true);
    });

    it('returns true when a specific server-level capability code is supported', () => {
      expect(capabilities.supportFor({ capabilityType: 'interaction', where: { code: 'history-system' } })).toBe(true);
    });
  });

  describe('interactionsFor', () => {
    it('returns an empty array when no arguments are passed', () => {
      expect(capabilities.interactionsFor()).toEqual([]);
    });

    it('returns an array of supported interactions for the interaction capability', () => {
      const expected = ['read', 'vread', 'update', 'patch', 'delete', 'history-instance', 'history-type', 'create', 'search-type'];
      expect(capabilities.interactionsFor({ resourceType: 'Patient' })).toEqual(expected);
    });
  });

  describe('searchParamsFor', () => {
    it('returns an empty array when no arguments are passed', () => {
      expect(capabilities.searchParamsFor()).toEqual([]);
    });

    it('returns an empty array when resourceCapabilities are undefined', () => {
      expect(capabilities.searchParamsFor({ resourceType: 'foo' })).toEqual([]);
    });

    it('returns an empty array when searchParams are undefined', () => {
      expect(capabilities.searchParamsFor({ resourceType: 'Binary' })).toEqual([]);
    });

    it('returns an array of supported search params', () => {
      const expected = ['_language', 'birthdate', 'deceased', 'address-state', 'gender', 'animal-species', 'link', 'language', 'animal-breed', 'address-country', 'death-date', 'phonetic', 'telecom', 'address-city', 'email', 'given', 'identifier', 'address', 'general-practitioner', 'active', 'address-postalcode', 'phone', 'organization', 'address-use', 'name', '_id', 'family'];
      expect(capabilities.searchParamsFor({ resourceType: 'Patient' })).toEqual(expected);
    });
  });

  describe('resourceCapabilities', () => {
    it('returns undefined when no arguments are passed', () => {
      expect(capabilities.resourceCapabilities()).toBeUndefined();
    });
  });

  describe('capabilityContents', () => {
    it('returns undefined when no arguments are passed', () => {
      expect(capabilities.capabilityContents()).toBeUndefined();
    });

    it('returns text for the conditionalDelete capability', () => {
      expect(capabilities.capabilityContents({ resourceType: 'Patient', capabilityType: 'conditionalDelete' })).toBe('multiple');
    });

    it('returns an array for the searchInclude capability', () => {
      const expected = ['*', 'Patient:general-practitioner', 'Patient:link', 'Patient:organization'];
      expect(capabilities.capabilityContents({ resourceType: 'Patient', capabilityType: 'searchInclude' })).toEqual(expected);
    });
  });

  describe('serverCapabilities', () => {
    it('returns all REST capabilities for server mode', () => {
      const serverCaps = capabilities.serverCapabilities();
      expect(serverCaps).toBe((capabilities.capabilityStatement as Record<string, unknown[]>).rest[0]);
    });
  });
});
