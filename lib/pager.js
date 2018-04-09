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
    const link = results.link.find(link => link.relation === 'next');
    return link ? this.httpClient.get(link.url) : undefined;
  }

  /**
   * Return the previous page of results.
   *
   * @param {object} results a bundle result of a FHIR search
   */
  prevPage(results) {
    const link = results.link.find(link => link.relation.match(/^prev(ious)?$/));
    return link ? this.httpClient.get(link.url) : undefined;
  }
}

module.exports = { Pager };
