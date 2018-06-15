/* eslint-disable func-names, no-unused-expressions */
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { expect } = require('chai');
const nock = require('nock');

const HttpClient = require('../lib/http-client');
const Pagination = require('../lib/pagination');

/**
 * Read fixture data
 *
 * @param {String} fixture - The fixture file
 *
 * @returns {String} - The data from a fixture
 */
function readStreamFor(fixture) {
  return fs.createReadStream(path.normalize(`${__dirname}/fixtures/${fixture}`, 'utf8'));
}

function readFixture(filename) {
  return JSON.parse(fs.readFileSync(path.normalize(`${__dirname}/fixtures/${filename}`, 'utf8')));
}

describe('Pagination', function () {
  beforeEach(function() {
    this.baseUrl = 'https://example.com';
    this.httpClient = new HttpClient({ baseUrl: this.baseUrl });
    this.pagination = new Pagination(this.httpClient);
  });

  describe('#initialize', function() {
    it('sets the current bundle', async function () {
      expect(this.pagination.currentResults).to.be.null;

      const searchResults = readFixture('search-results-page-1.json');

      this.pagination.initialize(searchResults);

      expect(this.pagination.currentResults).to.equal(searchResults);
    });

    it('uses an available link to extract search parameters', async function () {
      const expectedParameters = {
        _getpages: '678cd733-8823-4324-88a7-51d369cf78a9',
        _getpagesoffset: '3',
        _count: '3'
      }

      const searchResults = readFixture('search-results-page-1.json');

      this.pagination.initialize(searchResults);

      Object.entries(expectedParameters).forEach(([paramName, param]) => {
        expect(this.pagination[paramName]).to.equal(param);
      })
    });
  });

  describe('#goToPage', function () {
    it('returns httpClient get for a specified page number', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3')
        .reply(200, () => readStreamFor('search-results-page-2.json'));

      const searchResults = readFixture('search-results-page-1.json');

      this.pagination.initialize(searchResults);

      const response = await this.pagination.goToPage(2);
      const url = 'https://example.com/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3';

      expect(response.link[0].url).to.equal(url);
    });

    it('initializes pagination if a bundle is provided and returns httpClient get for a specified page number', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3')
        .reply(200, () => readStreamFor('search-results-page-2.json'));

      const searchResults = readFixture('search-results-page-1.json');

      const response = await this.pagination.goToPage(2, searchResults);
      const url = 'https://example.com/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3';

      expect(response.link[0].url).to.equal(url);
    });
  });

  describe('#currentPage', function () {
    it('returns httpClient get for the current link', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient?_count=3&gender=female')
        .reply(200, () => readStreamFor('search-results-page-1.json'));

      const searchResults = readFixture('search-results-page-1.json');

      this.pagination.initialize(searchResults);

      const response = await this.pagination.currentPage();
      const url = 'https://example.com/Patient?_count=3&gender=female';

      expect(response.link[0].url).to.equal(url);
    });

    it('initializes pagination if a bundle is provided and returns httpClient get for the current link', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/Patient?_count=3&gender=female')
        .reply(200, () => readStreamFor('search-results-page-1.json'));

      const searchResults = readFixture('search-results-page-1.json');

      const response = await this.pagination.currentPage(searchResults);
      const url = 'https://example.com/Patient?_count=3&gender=female';

      expect(response.link[0].url).to.equal(url);
    });
  });

  describe('#nextPage', function () {
    it('returns httpClient get for the next link', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3')
        .reply(200, () => readStreamFor('search-results-page-2.json'));

      const searchResults = readFixture('search-results-page-1.json');

      this.pagination.initialize(searchResults);

      const response = await this.pagination.nextPage();
      const url = 'https://example.com/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3';

      expect(response.link[0].url).to.equal(url);
    });

    it('initializes pagination if a bundle is provided and returns httpClient get for the next link', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3')
        .reply(200, () => readStreamFor('search-results-page-2.json'));

      const searchResults = readFixture('search-results-page-1.json');

      const response = await this.pagination.nextPage(searchResults);
      const url = 'https://example.com/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=3&_count=3';

      expect(response.link[0].url).to.equal(url);
    });

    it('returns undefined if no next page exists', function () {
      const searchResults = readFixture('search-results.json');

      this.pagination.initialize(searchResults);

      expect(this.pagination.nextPage()).to.equal(undefined);
    });
  });

  describe('#prevPage', function () {
    it('returns httpClient get for the previous link', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=0&_count=3')
        .reply(200, () => readStreamFor('search-results-page-1.json'));

      const searchResults = readFixture('search-results-page-2.json');

      this.pagination.initialize(searchResults);

      const response = await this.pagination.prevPage();
      const url = 'https://example.com/Patient?_count=3&gender=female';

      expect(response.link[0].url).to.equal(url);
    });

    it('initializes pagination if a bundle is provided and returns httpClient get for the previous link', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=0&_count=3')
        .reply(200, () => readStreamFor('search-results-page-1.json'));

      const searchResults = readFixture('search-results-page-2.json');

      const response = await this.pagination.prevPage(searchResults);
      const url = 'https://example.com/Patient?_count=3&gender=female';

      expect(response.link[0].url).to.equal(url);
    });

    it('returns undefined if no previous page exists', function () {
      const searchResults = readFixture('search-results.json');

      this.pagination.initialize(searchResults);

      expect(this.pagination.prevPage()).to.equal(undefined);
    });

    it('detects and responds to "prev" relations', async function () {
      nock(this.baseUrl)
        .matchHeader('accept', 'application/json+fhir')
        .get('/?_getpages=678cd733-8823-4324-88a7-51d369cf78a9&_getpagesoffset=0&_count=3')
        .reply(200, () => readStreamFor('search-results-page-1.json'));

      const searchResults = readFixture('search-results-page-2.json');
      searchResults.link[2].relation = 'prev';

      this.pagination.initialize(searchResults);

      const response = await this.pagination.prevPage();
      const url = 'https://example.com/Patient?_count=3&gender=female';

      expect(response.link[0].url).to.equal(url);
    });
  });
});
