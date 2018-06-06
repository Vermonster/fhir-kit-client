const { URL } = require('url');

/**
  * Class for paging Bundles.
  * @private
  *
  */
class Pagination {
  /**
   * Add pagination functionality for the provided client.
   *
   * @private
   * @param {HttpClient} httpClient a configured instance of http client.
   */
  constructor(httpClient) {
    this.httpClient = httpClient;
    this.baseUrl = httpClient.axiosInstance.defaults.baseURL;
    this.initialResults = null;
    this.currentResults = null;
    this._getpages = null;
    this._getpagesoffset = null;
    this._count = null;
  }

  initialize(results) {
    this.initialResults = results;
    this.currentResults = results;

    if (this.nextLink()) { this.parseUrl() };
  }

  parseUrl() {
    const nextUrl = new URL(this.nextLink().url);

    ['_getpages', '_getpagesoffset', '_count'].forEach((searchParam) => {
      this[searchParam] = nextUrl.searchParams.get(searchParam);
    })
  }

  nextLink() {
    return this.getLink(/next/);
  }

  prevLink() {
    return this.getLink(/^prev(ious)?$/);
  }

  selfLink() {
    return this.getLink(/self/);
  }

  goToPageLink(page) {
    const newOffset = (page * this._count) - this._count;

    return `${this.baseUrl}?_getpages=${this._getpages}&_getpagesoffset=${newOffset}&_count=${this._count}&_pretty=true&_bundletype=searchset`;
  }

  goToPage(page) {
    const selectedPage = this.goToPageLink(page);

    this.currentResults = selectedPage ? this.httpClient.get(selectedPage) : undefined;
    return this.currentResults;
  }

  currentPage() {
    return this.getAndSetCurrent(this.selfLink());
  }

  /**
   * Return the next page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  nextPage() {
    return this.getAndSetCurrent(this.nextLink());
  }

  /**
   * Return the previous page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  prevPage() {
    return this.getAndSetCurrent(this.prevLink());
  }

  getAndSetCurrent(link) {
    this.currentResults = link ? this.httpClient.get(link.url) : undefined;
    return this.currentResults;
  }

  getLink(regex) {
    return this.currentResults.link.find(link => link.relation.match(regex));
  }
}

module.exports = Pagination;
