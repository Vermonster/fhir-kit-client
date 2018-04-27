/* eslint-disable func-names, no-unused-expressions */
const fs = require('fs');
const path = require('path');

const { expect } = require('chai');

const Capabilities = require('../lib/capabilities');

function readFixture(filename) {
  return JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/${filename}`, 'utf8')));
}

describe('Capabilities', function () {
  beforeEach(function () {
    const capabilityStatement = readFixture(('valid-capability-statement.json'));
    this.capabilities = new Capabilities(capabilityStatement);
  });

  describe('#supportFor', () => {
    it('returns true when a resource interaction capability is in the capability statement', function () {
      const patientReadSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'interaction', where: { code: 'read' } });

      expect(patientReadSupport).to.be.true;
    });

    it('returns false when a resource interaction capability is not in the capability statement', function () {
      const patientReadSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'interaction', where: { code: 'foo' } });

      expect(patientReadSupport).to.be.false;
    });

    it('returns true when a conditional create capability is in the capability statement', function () {
      const conditionalCreateSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'conditionalCreate' });

      expect(conditionalCreateSupport).to.be.true;
    });

    it('returns true when a specific search param capability is in the capability statement', function () {
      const birthDateSearchSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'searchParam', where: { name: 'birthdate' } });

      expect(birthDateSearchSupport).to.be.true;
    });

    it('returns false when a specific search param capability is in the capability statement', function () {
      const birthDateSearchSupport = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'searchParam', where: { name: 'foo' } });

      expect(birthDateSearchSupport).to.be.false;
    });

    it('returns an array of supported search params for the searchParam capability', function () {
      const supportedSearchParams = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'searchParam' });
      const expectedSearchParams = ['_language', 'birthdate', 'deceased', 'address-state', 'gender', 'animal-species', 'link', 'language', 'animal-breed', 'address-country', 'death-date', 'phonetic', 'telecom', 'address-city', 'email', 'given', 'identifier', 'address', 'general-practitioner', 'active', 'address-postalcode', 'phone', 'organization', 'address-use', 'name', '_id', 'family'];

      expect(supportedSearchParams).to.deep.equal(expectedSearchParams);
    });

    it('returns an array of supported interactions for the interaction capability', function () {
      const supportedSearchParams = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'interaction' });
      const expectedSearchParams = ['read', 'vread', 'update', 'patch', 'delete', 'history-instance', 'history-type', 'create', 'search-type'];

      expect(supportedSearchParams).to.deep.equal(expectedSearchParams);
    });

    it('returns an array as-is for the searchInclude capability', function () {
      const supportedSearchIncludes = this.capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'searchInclude' });
      const expectedSearchIncludes = ['*', 'Patient:general-practitioner', 'Patient:link', 'Patient:organization'];

      expect(supportedSearchIncludes).to.deep.equal(expectedSearchIncludes);
    });
  });
});
