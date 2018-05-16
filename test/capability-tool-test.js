/* eslint-disable func-names, no-unused-expressions */
const fs = require('fs');
const path = require('path');

const { expect } = require('chai');

const CapabilityTool = require('../lib/capability-tool');

function readFixture(filename) {
  return JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/${filename}`, 'utf8')));
}

describe('CapabilityTool', function () {
  beforeEach(function () {
    const capabilityStatement = readFixture(('valid-capability-statement.json'));
    this.capabilities = new CapabilityTool(capabilityStatement);
  });

  describe('#serverCan', function () {
    it('returns true when a server interaction is supported', function () {
      const batchSupport = this.capabilities.serverCan('batch');

      expect(batchSupport).to.be.true;
    });

    it('returns false when a server interaction is not supported', function () {
      const transactionSupport = this.capabilities.serverCan('transaction');

      expect(transactionSupport).to.be.false;
    });
  });

  describe('#resourceCan', function () {
    it('returns true when a resource interaction is supported', function () {
      const patientReadSupport = this.capabilities.resourceCan('Patient', 'read');

      expect(patientReadSupport).to.be.true;
    });

    it('returns false when a resource interaction is not supported', function () {
      const patientFooSupport = this.capabilities.resourceCan('Patient', 'foo');

      expect(patientFooSupport).to.be.false;
    });
  });

  describe('#serverSearch', function () {
    it('returns true when a server-level search parameter is supported', function () {
      const textSearchSupport = this.capabilities.serverSearch('_text');

      expect(textSearchSupport).to.be.true;
    });

    it('returns false when a server-level search parameter is not supported', function () {
      const tagSearchSupport = this.capabilities.serverSearch('_tag');

      expect(tagSearchSupport).to.be.false;
    });
  });

  describe('#resourceSearch', function () {
    it('returns true when a resource-level search parameter is supported', function () {
      const genderSearchSupport = this.capabilities.resourceSearch('Patient', 'gender');

      expect(genderSearchSupport).to.be.true;
    });

    it('returns false when a resource-level search parameter is not supported', function () {
      const fooSearchSupport = this.capabilities.serverSearch('foo');

      expect(fooSearchSupport).to.be.false;
    });
  });

  describe('#supportFor', function () {
    it('returns false when no arguments are passed', function () {
      const noArgSupport = this.capabilities.supportFor();

      expect(noArgSupport).to.be.false;
    });

    it('returns true when a resource-level interaction capability is in the capability statement', function () {
      const patientReadSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'interaction', where: { code: 'read' } });

      expect(patientReadSupport).to.be.true;
    });

    it('returns false when a resource-level interaction capability is not in the capability statement', function () {
      const patientFooSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'interaction', where: { code: 'foo' } });

      expect(patientFooSupport).to.be.false;
    });

    it('returns true when a resource-level capability is in the capability statement', function () {
      const conditionalCreateSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'conditionalCreate' });

      expect(conditionalCreateSupport).to.be.true;
    });

    it('returns true when a resource-level search param capability is in the capability statement', function () {
      const birthDateSearchSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'searchParam', where: { name: 'birthdate' } });

      expect(birthDateSearchSupport).to.be.true;
    });

    it('returns false when a resource-level search param capability is not in the capability statement', function () {
      const fooSearchSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'searchParam', where: { name: 'foo' } });

      expect(fooSearchSupport).to.be.false;
    });

    it('returns true when a resource-level conditional delete capability is in the capability statement', function () {
      const conditionalDeleteSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'conditionalDelete' });

      expect(conditionalDeleteSupport).to.be.true;
    });

    it('returns false when a resource is not in the capability statement', function () {
      const fooSupport = this.capabilities.supportFor({ resourceType: 'Foo', capabilityType: 'interactions' });

      expect(fooSupport).to.be.false;
    });

    it('returns false when a server-level capability is not supported', function () {
      const fooSupport = this.capabilities.supportFor({ capabilityType: 'foo' });

      expect(fooSupport).to.be.false;
    });

    it('returns true when a server-level capability is supported', function () {
      const interactionsSupport = this.capabilities.supportFor({ capabilityType: 'interaction' });

      expect(interactionsSupport).to.be.true;
    });

    it('returns true when a specific server-level capability code is supported', function () {
      const interactionsSupport = this.capabilities.supportFor({ capabilityType: 'interaction', where: { code: 'history-system' } });

      expect(interactionsSupport).to.be.true;
    });
  });

  describe('#interactionsFor', function () {
    it('returns false when no arguments are passed', function () {
      const noArgSupport = this.capabilities.interactionsFor();

      expect(noArgSupport).to.be.false;
    });

    it('returns an array of supported interactions for the interaction capability', function () {
      const supportedSearchParams = this.capabilities.interactionsFor({ resourceType: 'Patient' });
      const expectedSearchParams = ['read', 'vread', 'update', 'patch', 'delete', 'history-instance', 'history-type', 'create', 'search-type'];

      expect(supportedSearchParams).to.deep.equal(expectedSearchParams);
    });
  });

  describe('#searchParamsFor', function () {
    it('returns false when no arguments are passed', function () {
      const noArgSupport = this.capabilities.searchParamsFor();

      expect(noArgSupport).to.be.false;
    });

    it('returns false when resourceCapabilities are undefined', function () {
      const undefinedSearch = this.capabilities.searchParamsFor({ resourceType: 'foo' });

      expect(undefinedSearch).to.be.false;
    });

    it('returns false when searchParams are undefined', function () {
      const undefinedSearch = this.capabilities.searchParamsFor({ resourceType: 'Binary' });

      expect(undefinedSearch).to.be.false;
    });

    it('returns an array of supported search params for the searchParam capability', function () {
      const supportedSearchParams = this.capabilities.searchParamsFor({ resourceType: 'Patient', capabilityType: 'searchParam' });
      const expectedSearchParams = ['_language', 'birthdate', 'deceased', 'address-state', 'gender', 'animal-species', 'link', 'language', 'animal-breed', 'address-country', 'death-date', 'phonetic', 'telecom', 'address-city', 'email', 'given', 'identifier', 'address', 'general-practitioner', 'active', 'address-postalcode', 'phone', 'organization', 'address-use', 'name', '_id', 'family'];

      expect(supportedSearchParams).to.deep.equal(expectedSearchParams);
    });
  });

  describe('#resourceCapabilities', function () {
    it('returns undefined when no arguments are passed', function () {
      const noArgSupport = this.capabilities.resourceCapabilities();

      expect(noArgSupport).to.be.undefined;
    });
  });

  describe('#capabilityContents', function () {
    it('returns undefined when no arguments are passed', function () {
      const noArgSupport = this.capabilities.capabilityContents();

      expect(noArgSupport).to.be.undefined;
    });

    it('returns text for the conditionalDelete capability', function () {
      const conditionalDeleteContents = this.capabilities.capabilityContents({ resourceType: 'Patient', capabilityType: 'conditionalDelete' });

      expect(conditionalDeleteContents).to.equal('multiple');
    });

    it('returns an array for the searchInclude capability', function () {
      const searchIncludeContents = this.capabilities.capabilityContents({ resourceType: 'Patient', capabilityType: 'searchInclude' });
      const expectedSearchIncludes = ['*', 'Patient:general-practitioner', 'Patient:link', 'Patient:organization'];

      expect(searchIncludeContents).to.deep.equal(expectedSearchIncludes);
    });
  });

  describe('#serverCapabilities', function () {
    it('returns all REST capabilities for server mode in the capability statement', function () {
      const serverCapabilities = this.capabilities.serverCapabilities();

      expect(serverCapabilities).to.equal(this.capabilities.capabilityStatement.rest[0]);
    });
  });
});
