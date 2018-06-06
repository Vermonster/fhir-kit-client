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
  constructor(httpClient, paramNames = {}) {
    this.httpClient = httpClient;
    this.baseUrl = httpClient.axiosInstance.defaults.baseURL;
    this.initialResults = null;
    this.currentResults = null;

    const defaultParamNames = {
      stateIdParam: '_getpages',
      offsetParam: '_getpagesoffset',
      countParam: '_count'
    }

    this.paramNames = Object.assign({}, defaultParamNames, paramNames);
  }

  initialize(results) {
    this.initialResults = results;
    this.currentResults = results;

    if (this.nextLink()) { this.parseUrl() };
  }

  parseUrl() {
    const nextUrl = new URL(this.nextLink().url);

    Object.keys(this.paramNames).forEach((paramName) => {
      const param = this.paramNames[paramName];
      this[param] = nextUrl.searchParams.get(param);
    });
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
    const countParam = this.paramNames.countParam;
    const newOffset = (page * this[countParam]) - this[countParam];
    const paramNames = Object.keys(this.paramNames);

    let pageLinkUrl = new URL(`${this.baseUrl}/`);

    paramNames.forEach((paramName) => {
      const param = this.paramNames[paramName];
      pageLinkUrl.searchParams.append(param, this[param]);
    });

    return pageLinkUrl.href;
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
