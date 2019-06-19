/* eslint-disable func-names, no-unused-expressions */
import { expect } from 'chai';

import { splitReference } from '../lib/utils';

describe('utils', function () {
  describe('splitReference', function () {
    const baseUrl = 'https://www.example.com/fhir';
    const id = '1234';

    context('with an absolute reference', function () {
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
});
