/* eslint-disable func-names, no-unused-expressions */
const { expect } = require('chai');

const { splitReference, validateParameters } = require('../lib/utils');

describe('utils', function () {
  describe('splitReference', function () {
    const baseUrl = 'https://www.example.com/fhir';
    const id = '1234';

    context('with an absolute reference', function () {
      context('with an R4 reference', function () {
        it('returns the baseUrl, resource type, and id', function () {
          const resourceType = 'MedicationKnowledge';
          const absoluteReference = `${baseUrl}/${resourceType}/${id}`;
          expect(splitReference(absoluteReference).baseUrl).to.equal(baseUrl);
          expect(splitReference(absoluteReference).resourceType).to.equal(resourceType);
          expect(splitReference(absoluteReference).id).to.equal(id);
        });
      });

      context('with an STU3 reference', function () {
        it('returns the baseUrl, resource type, and id', function () {
          const resourceType = 'MedicationRequest';
          const absoluteReference = `${baseUrl}/${resourceType}/${id}`;
          expect(splitReference(absoluteReference).baseUrl).to.equal(baseUrl);
          expect(splitReference(absoluteReference).resourceType).to.equal(resourceType);
          expect(splitReference(absoluteReference).id).to.equal(id);
        });
      });

      context('with a DSTU2 reference', function () {
        it('returns the baseUrl, resource type, and id', function () {
          const resourceType = 'MedicationOrder';
          const absoluteReference = `${baseUrl}/${resourceType}/${id}`;
          expect(splitReference(absoluteReference).baseUrl).to.equal(baseUrl);
          expect(splitReference(absoluteReference).resourceType).to.equal(resourceType);
          expect(splitReference(absoluteReference).id).to.equal(id);
        });
      });
    });

    context('with a relative reference', function () {
      it('returns the resource type and id', function () {
        const resourceType = 'Patient';
        const relativeReference = `${resourceType}/${id}`;
        expect(splitReference(relativeReference).baseUrl).to.be.undefined;
        expect(splitReference(relativeReference).resourceType).to.equal(resourceType);
        expect(splitReference(relativeReference).id).to.equal(id);
      });
    });

    context('with an invalid reference', function () {
      it('throws an error', function () {
        const resourceType = 'Patent'; // intentional misspelling so reference is invalid
        const absoluteReference = `${baseUrl}/${resourceType}/${id}`;
        const expectedError = `${absoluteReference} is not a recognized FHIR reference`;
        expect(() => splitReference(absoluteReference)).to.throw(expectedError);
      });
    });
  });

  describe('validateParameters', function () {
    describe('resourceType', function () {
      const expectedError = 'Invalid FHIR resourceType.';
      context('with a valid id', function () {
        it('should not throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
          })).to.not.throws();
        });
      });
      context('with an invalid resourec type', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: '../../Canard',
          })).to.throw(expectedError);
        });
      });
    });
    describe('ID', function () {
      const expectedError = 'Invalid FHIR ID.';
      context('with a valid id', function () {
        it('should not throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '1234',
          })).to.not.throws();
        });
      });
      context('with a too long id', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '1111111111111111111111111111111111111111111111111'
              + '1111111111111111111111111111111111111111111111111',
          })).to.throw(expectedError);
        });
      });
      context('with a too short id', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '',
          })).to.throw(expectedError);
        });
      });
      context('with invalid characters', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '1234/_history/456',
          })).to.throw(expectedError);
        });
      });
      context('missing but required', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: undefined,
            requireId: true,
          })).to.throw(expectedError);
        });
      });
    });
    describe('Version', function () {
      const expectedError = 'Invalid FHIR version.';
      context('with a valid version', function () {
        it('should not throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '1234',
            version: '1234',
          })).to.not.throws();
        });
      });
      context('with a too long version', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '1234',
            version: '1111111111111111111111111111111111111111111111111'
              + '1111111111111111111111111111111111111111111111111',
          })).to.throw(expectedError);
        });
      });
      context('with a too short version', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '1234',
            version: '',
          })).to.throw(expectedError);
        });
      });
      context('with invalid characters', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '1234',
            version: '1234/_history/456',
          })).to.throw(expectedError);
        });
      });
      context('missing but required', function () {
        it('should throws an error', function () {
          expect(() => validateParameters({
            resourceType: 'Patient',
            id: '1234',
            version: undefined,
            requireVersion: true,
          })).to.throw(expectedError);
        });
      });
    });
  });
});
