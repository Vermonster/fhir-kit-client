/* eslint-disable func-names */

const fs = require('fs');
const path = require('path');

const { expect } = require('chai');
const { Pager } = require('../lib/pager');

function readFixture(filename) {
  return JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/${filename}`, 'utf8')));
}

const mockHttpClient = {
  get: url => url,
};

describe('Pager', () => {
  beforeEach(function () {
    this.pager = new Pager(mockHttpClient);
  });

  describe('#nextPage', () => {
    it('returns httpClient get for the next link', function () {
      const results = readFixture('search-results-page-1.json');
      const url = 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3&_pretty=true&_bundletype=searchset';
      expect(this.pager.nextPage(results)).to.equal(url);
    });

    it('returns undefined if no next page exists', function () {
      const results = readFixture('search-results.json');
      const url = 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open/Patient?name=abbott';
      expect(this.pager.nextPage(results)).to.equal(undefined);
    });
  });

  describe('#prevPage', () => {
    it('returns httpClient get for the previous link', function () {
      const results = readFixture('search-results-page-2.json');
      const url = 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=0&_count=3&_pretty=true&_bundletype=searchset';
      expect(this.pager.prevPage(results)).to.equal(url);
    });

    it('returns undefined if no previous page exists', function() {
      const results = readFixture('search-results.json');
      const url = 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open/Patient?name=abbott';
      expect(this.pager.nextPage(results)).to.equal(undefined);
    });

    it('detects "prev" relations', function () {
      const results = readFixture('search-results-page-2.json');
      results.link[2].relation = 'prev';
      const url = 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=0&_count=3&_pretty=true&_bundletype=searchset';
      expect(this.pager.prevPage(results)).to.equal(url);
    });
  });
});
