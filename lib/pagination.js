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
  }

  /**
   * Return the next page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  nextPage(results) {
    const nextLink = results.link.find(link => link.relation === 'next');
    return nextLink ? this.httpClient.get(nextLink.url) : undefined;
  }

  /**
   * Return the previous page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   *
   * @return {Promise<Object>} FHIR resources in a FHIR Bundle structure.
   */
  prevPage(results) {
    const prevLink = results.link.find(link => link.relation.match(/^prev(ious)?$/));
    return prevLink ? this.httpClient.get(prevLink.url) : undefined;
  }
}

module.exports = Pagination;
