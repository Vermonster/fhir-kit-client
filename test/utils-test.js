/* eslint-disable func-names, no-unused-expressions */
const { expect } = require('chai');

const { splitReference } = require('../lib/utils');

describe('utils', () => {
  describe('splitReference', () => {
    const resourceType = 'Patient';
    const id = '1234';

    context('with an absolute reference', () => {
      const baseUrl = 'https://example.com/fhir';

      it('returns the baseUrl, resource type, and id', () => {
        const absoluteReference = `${baseUrl}/${resourceType}/${id}`;
        expect(splitReference(absoluteReference).baseUrl).to.equal(baseUrl);
        expect(splitReference(absoluteReference).resourceType).to.equal(resourceType);
        expect(splitReference(absoluteReference).id).to.equal(id);
      });
    });

    context('with a relative reference', () => {
      it('returns the resource type and id', () => {
        const relativeReference = `${resourceType}/${id}`;
        expect(splitReference(relativeReference).baseUrl).to.be.undefined;
        expect(splitReference(relativeReference).resourceType).to.equal(resourceType);
        expect(splitReference(relativeReference).id).to.equal(id);
      });
    });
  });
});
