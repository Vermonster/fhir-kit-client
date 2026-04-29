import type { FhirResource, RequestOptions } from './types.js';
import type { HttpClient } from './http-client.js';

interface BundleLink {
  relation: string;
  url: string;
}

interface Bundle extends FhirResource {
  link: BundleLink[];
}

/**
 * Pagination helper — used internally by Client.
 */
export class Pagination {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  nextPage(bundle: Bundle, options?: RequestOptions): Promise<FhirResource> | undefined {
    const link = bundle.link?.find((l) => l.relation === 'next');
    return link ? this.httpClient.get(link.url, options) : undefined;
  }

  prevPage(bundle: Bundle, options?: RequestOptions): Promise<FhirResource> | undefined {
    const link = bundle.link?.find((l) => /^prev(ious)?$/.test(l.relation));
    return link ? this.httpClient.get(link.url, options) : undefined;
  }
}
