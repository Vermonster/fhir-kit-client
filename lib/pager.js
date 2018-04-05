/** Class for paging Bundles. */
class Pager {
  /**
   * Create a pager for the provided client.
   *
   * @param {HttpClient} httpClient a configured instance of http client.
   */
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Return the next page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   */
  nextPage(results) {
    const { url } = results.link.find(link => link.relation === 'next');
    return this.httpClient.get(url);
  }

  /**
   * Return the previous page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   */
  prevPage(results) {
    const { url } = results.link.find(link => link.relation === 'previous');
    return this.httpClient.get(url);
  }
}

module.exports = { Pager };
