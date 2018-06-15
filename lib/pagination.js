const { URL } = require('url');

/**
  * Class for paging Bundles.
  *
  */
class Pagination {
  /**
   * Add pagination functionality for the provided client.
   *
   * FHIR-conforming servers that support pagination will, at minimum,
   * allow for the use of `currentPage()`, `prevPage()`, and `nextPage()`.
   * (see https://www.hl7.org/fhir/http.html#paging)
   *
   * Some servers will also have page offset and/or unique search IDs,
   * which enable `goToPage()`. The parameter names can optionally be renamed
   * here if needed for variations in server parameter names.
   *
   * @param {HttpClient} httpClient a configured instance of http client.
   * @param {Object} paramNames pagination-related search parameter names, optional.
   * @param {Object} [paramNames.searchIdParam] server-based unique ID for search session, optional.
   * @param {Object} [paramNames.offsetParam] server-based page offset for search, optional.
   * @param {Object} [paramNames.countParam] server-based result count per page, optional.
   */
  constructor(httpClient, paramNames = {}) {
    this.httpClient = httpClient;
    this.baseUrl = httpClient.axiosInstance.defaults.baseURL;
    this.currentResults = null;

    const defaultParamNames = {
      searchIdParam: '_getpages',
      offsetParam: '_getpagesoffset',
      countParam: '_count',
    };

    this.paramNames = Object.assign({}, defaultParamNames, paramNames);
  }

  /**
   * Initialize pagination functionality based on current bundle results.
   *
   * @param {object} bundle a results bundle of a FHIR search.
   *
   * @returns {void}
   */
  initialize(bundle) {
    this.currentResults = bundle;

    const availableLink = this.nextLink() || this.prevLink() || this.selfLink();
    if (availableLink) { this.extractSearchParams(availableLink); }
  }

  /**
   * Extract each type of param (searchIdParam, offsetParam, & countParam) from link.
   *
   * @param {string} link a link containing search parameters matching indicated paramNames.
   *
   * @returns {void}
   */
  extractSearchParams(link) {
    const linkUrl = new URL(link.url);

    Object.entries(this.paramNames).forEach(([_paramType, paramName]) => {
      this[paramName] = linkUrl.searchParams.get(paramName);
    });
  }

  /**
   * Return the specified page of results based on available search parameters.
   *
   * @param {number} page the page number to navigate to.
   * @param {object} [bundle] a results bundle of a FHIR search, optional.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  goToPage(page, bundle) {
    if (bundle) { this.initialize(bundle) };
    const selectedPage = this.goToPageLink(page);

    this.currentResults = selectedPage ? this.httpClient.get(selectedPage) : undefined;
    return this.currentResults;
  }

  /**
   * Return the current page of results.
   *
   * @param {object} [bundle] a results bundle of a FHIR search, optional.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  currentPage(bundle) {
    if (bundle) { this.initialize(bundle) };
    return this.getAndSetCurrent(this.selfLink());
  }

  /**
   * Return the next page of results.
   *
   * @param {object} [bundle] a results bundle of a FHIR search, optional.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  nextPage(bundle) {
    if (bundle) { this.initialize(bundle) };
    return this.getAndSetCurrent(this.nextLink());
  }

  /**
   * Return the previous page of results.
   *
   * @param {object} [bundle] a results bundle of a FHIR search, optional.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  prevPage(bundle) {
    if (bundle) { this.initialize(bundle) };
    return this.getAndSetCurrent(this.prevLink());
  }

  /**
   * Return the link for the next page of results.
   *
   * @return {String} link for the next page of results.
   */
  nextLink() {
    return this.findLink(/next/);
  }

  /**
   * Return the link for the previous page of results.
   *
   * @return {String} link for the previous page of results.
   */
  prevLink() {
    return this.findLink(/^prev(ious)?$/);
  }

  /**
   * Return the link for the current page of results.
   *
   * @return {String} link for the current page of results.
   */
  selfLink() {
    return this.findLink(/self/);
  }

  /**
   * Return a link for the specified page of results based on available search parameters.
   *
   * @param {number} page the page number to navigate to.
   *
   * @return {String} link for the specified page of results.
   */
  goToPageLink(page) {
    const { countParam, offsetParam } = this.paramNames;

    this[offsetParam] = (page * this[countParam]) - this[countParam];
    const paramNames = Object.keys(this.paramNames);

    const pageLinkUrl = new URL(`${this.baseUrl}`);

    paramNames.forEach((paramName) => {
      const param = this.paramNames[paramName];
      pageLinkUrl.searchParams.append(param, this[param]);
    });

    return pageLinkUrl.href;
  }

  /**
   * Return results and set them to the current results.
   *
   * @param {String} link a link referring to a page of search results.
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  getAndSetCurrent(link) {
    this.currentResults = link ? this.httpClient.get(link.url) : undefined;
    return this.currentResults;
  }

  /**
   * Return a link from the current results bundle.
   *
   * @param {String} regex to match specific link text.
   *
   * @return {String} link to specified page based on regex.
   */
  findLink(regex) {
    return this.currentResults.link.find(link => link.relation.match(regex));
  }
}

module.exports = Pagination;
