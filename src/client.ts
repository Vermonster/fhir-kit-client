import { HttpClient } from './http-client.js';
import { Pagination } from './pagination.js';
import { ReferenceResolver } from './reference-resolver.js';
import { authFromCapability, authFromWellKnown } from './smart.js';
import { FetchQueue } from './fetch-queue.js';
import { validResourceType, createQueryString } from './utils.js';
import type {
  ClientConfig,
  FhirResource,
  OpPatch,
  RequestOptions,
  SearchParams,
  SmartAuthMetadata,
} from './types.js';

interface ReadParams {
  resourceType: string;
  id: string;
  options?: RequestOptions;
}

interface VreadParams {
  resourceType: string;
  id: string;
  version: string;
  options?: RequestOptions;
}

interface CreateParams {
  resourceType: string;
  body: FhirResource;
  options?: RequestOptions;
}

interface UpdateParams {
  resourceType: string;
  id?: string;
  searchParams?: SearchParams;
  body: FhirResource;
  options?: RequestOptions;
}

interface DeleteParams {
  resourceType: string;
  id: string;
  options?: RequestOptions;
}

interface PatchParams {
  resourceType: string;
  id: string;
  JSONPatch: OpPatch[];
  options?: RequestOptions;
}

interface BundleParams {
  body: FhirResource;
  options?: RequestOptions;
}

interface OperationParams {
  name: string;
  resourceType?: string;
  id?: string;
  method?: 'GET' | 'POST';
  input?: FhirResource | SearchParams;
  options?: RequestOptions;
}

interface SearchParams_ {
  resourceType?: string;
  compartment?: { resourceType: string; id: string };
  searchParams?: SearchParams;
  options?: RequestOptions;
}

interface ResourceSearchParams {
  resourceType: string;
  searchParams?: SearchParams;
  options?: RequestOptions;
}

interface SystemSearchParams {
  searchParams?: SearchParams;
  options?: RequestOptions;
}

interface CompartmentSearchParams {
  resourceType: string;
  compartment: { resourceType: string; id: string };
  searchParams?: SearchParams;
  options?: RequestOptions;
}

interface HistoryParams {
  resourceType?: string;
  id?: string;
  options?: RequestOptions;
}

interface PaginationParams {
  bundle: FhirResource & { link: Array<{ relation: string; url: string }> };
  options?: RequestOptions;
}

interface RequestParams {
  method?: string;
  options?: RequestOptions;
  body?: unknown;
}

/**
 * FHIR client. Provides methods for all FHIR REST interactions.
 *
 * @example
 * const client = new Client({ baseUrl: 'https://r4.smarthealthit.org' });
 * const patient = await client.read({ resourceType: 'Patient', id: '123' });
 */
export class Client {
  readonly httpClient: HttpClient;
  readonly pagination: Pagination;
  private readonly resolver: ReferenceResolver;

  constructor({ baseUrl, customHeaders, requestOptions, requestSigner, bearerToken }: ClientConfig = {} as ClientConfig) {
    this.httpClient = new HttpClient({ baseUrl, customHeaders, requestOptions, requestSigner });
    if (bearerToken) {
      this.httpClient.bearerToken = bearerToken;
    }
    this.resolver = new ReferenceResolver(this);
    this.pagination = new Pagination(this.httpClient);
  }

  /** Return the underlying HTTP request and response for a FHIR response object. */
  static httpFor(requestResponse: FhirResource): { request: Request | undefined; response: Response | undefined } {
    return {
      request: HttpClient.requestFor(requestResponse),
      response: HttpClient.responseFor(requestResponse),
    };
  }

  get baseUrl(): string {
    return this.httpClient.baseUrl;
  }

  set baseUrl(url: string) {
    this.httpClient.baseUrl = url;
  }

  get customHeaders(): Record<string, string> {
    return this.httpClient.customHeaders;
  }

  set customHeaders(headers: Record<string, string>) {
    this.httpClient.customHeaders = headers;
  }

  set bearerToken(token: string) {
    this.httpClient.bearerToken = token;
  }

  /**
   * Resolve a FHIR reference to a resource.
   * Supports absolute URLs, relative URLs, bundle-scoped, and contained (#) references.
   */
  resolve({
    reference,
    context,
    options,
  }: {
    reference: string;
    context?: FhirResource;
    options?: RequestOptions;
  }): Promise<FhirResource> {
    return this.resolver.resolve({ reference, context, options });
  }

  /**
   * Get SMART OAuth authorization URLs from the capability statement or .well-known endpoints.
   */
  async smartAuthMetadata({ options = {} }: { options?: RequestOptions } = {}): Promise<SmartAuthMetadata> {
    const fetchOptions: RequestOptions = {
      ...options,
      headers: { accept: 'application/fhir+json,application/json', ...options.headers },
    };

    const normalizedBaseUrl = this.baseUrl.replace(/\/*$/, '/');
    const queue = new FetchQueue();
    const metadataJob = queue.buildJob();
    const wellknownSmartJob = queue.buildJob();
    const wellknownOidcJob = queue.buildJob();
    const errors: Error[] = [];

    return new Promise((resolve, reject) => {
      const handleError = (error: Error): void => {
        if (errors.push(error) === queue.numJobs) {
          reject(new Error(errors.map((e) => e.message).join('; ')));
        }
      };

      this.httpClient.request('GET', `${normalizedBaseUrl}.well-known/smart-configuration`, wellknownSmartJob.addSignalOption(fetchOptions))
        .then((r) => { queue.safeAbortOthers(wellknownSmartJob); resolve(authFromWellKnown(r)); })
        .catch(handleError);

      this.capabilityStatement(metadataJob.addSignalOption(fetchOptions))
        .then((r) => { queue.safeAbortOthers(metadataJob); resolve(authFromCapability(r)); })
        .catch(handleError);

      this.httpClient.request('GET', `${normalizedBaseUrl}.well-known/openid-configuration`, wellknownOidcJob.addSignalOption(fetchOptions))
        .then((r) => { queue.safeAbortOthers(wellknownOidcJob); resolve(authFromWellKnown(r)); })
        .catch(handleError);
    });
  }

  /** Fetch the server's CapabilityStatement. */
  capabilityStatement(options?: RequestOptions): Promise<FhirResource> {
    return this.httpClient.get('metadata', options);
  }

  /**
   * Run a raw request against the FHIR server.
   *
   * @example
   * client.request('Patient/123')
   * client.request('Patient/123', { method: 'DELETE' })
   * client.request('Patient', { method: 'POST', body: newPatient })
   */
  request(requestUrl: string, { method = 'GET', options = {}, body }: RequestParams = {}): Promise<FhirResource> {
    return this.httpClient.request(method, requestUrl, options, body);
  }

  /** Read a resource by type and id. */
  read({ resourceType, id, options }: ReadParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.get(`${resourceType}/${id}`, options);
  }

  /** Read a specific version of a resource. */
  vread({ resourceType, id, version, options }: VreadParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.get(`${resourceType}/${id}/_history/${version}`, options);
  }

  /** Create a new resource. */
  create({ resourceType, body, options }: CreateParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.post(resourceType, body, options);
  }

  /** Delete a resource by type and id. */
  delete({ resourceType, id, options }: DeleteParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.delete(`${resourceType}/${id}`, options);
  }

  /** Update a resource. Supports conditional update via searchParams. */
  update({ resourceType, id, searchParams, body, options }: UpdateParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    if (id && searchParams) throw new Error('Cannot specify both id and searchParams for update');

    if (searchParams) {
      const query = createQueryString(searchParams);
      return this.httpClient.put(`${resourceType}?${query}`, body, options);
    }
    return this.httpClient.put(`${resourceType}/${id}`, body, options);
  }

  /**
   * Patch a resource using JSON Patch (RFC 6902).
   * Content-Type: application/json-patch+json
   */
  patch({ resourceType, id, JSONPatch, options = {} }: PatchParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    const headers = { ...options.headers, 'Content-Type': 'application/json-patch+json' };
    return this.httpClient.patch(`${resourceType}/${id}`, JSONPatch, { ...options, headers });
  }

  /** Submit a batch Bundle. */
  batch({ body, options }: BundleParams): Promise<FhirResource> {
    return this.httpClient.post('/', body, options);
  }

  /** Submit a transaction Bundle. */
  transaction({ body, options }: BundleParams): Promise<FhirResource> {
    return this.httpClient.post('/', body, options);
  }

  /**
   * Run a FHIR operation ($name) at system, type, or instance level.
   */
  operation({ name, resourceType, id, method = 'POST', input, options = {} }: OperationParams): Promise<FhirResource> {
    const urlParts = ['/'];
    if (resourceType) {
      if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
      urlParts.push(`${resourceType}/`);
    }
    if (id) urlParts.push(`${id}/`);
    urlParts.push(name.startsWith('$') ? name : `$${name}`);

    const url = urlParts.join('');

    if (method === 'POST') {
      return this.httpClient.post(url, input, options);
    }

    const getUrl = input ? `${url}?${createQueryString(input as SearchParams)}` : url;
    return this.httpClient.get(getUrl, options);
  }

  /** Return the next page of a Bundle search result. */
  nextPage({ bundle, options }: PaginationParams): Promise<FhirResource> | undefined {
    return this.pagination.nextPage(bundle, options);
  }

  /** Return the previous page of a Bundle search result. */
  prevPage({ bundle, options }: PaginationParams): Promise<FhirResource> | undefined {
    return this.pagination.prevPage(bundle, options);
  }

  /**
   * Search for resources. Routes to compartment, resource-type, or system search
   * depending on the parameters provided.
   */
  search({ resourceType, compartment, searchParams, options }: SearchParams_ = {}): Promise<FhirResource> {
    if (resourceType && !validResourceType(resourceType)) {
      throw new Error(`Invalid resourceType: ${resourceType}`);
    }

    if (compartment && resourceType) {
      return this.compartmentSearch({ resourceType, compartment, searchParams, options });
    }
    if (resourceType) {
      return this.resourceSearch({ resourceType, searchParams, options });
    }
    if (searchParams && Object.keys(searchParams).length > 0) {
      return this.systemSearch({ searchParams, options });
    }

    throw new Error('search requires either searchParams or a resourceType');
  }

  /** Search within a specific resource type. */
  resourceSearch({ resourceType, searchParams, options = {} }: ResourceSearchParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    const searchPath = options.postSearch ? `${resourceType}/_search` : resourceType;
    return this.baseSearch({ searchPath, searchParams, options });
  }

  /** System-wide search. */
  systemSearch({ searchParams, options = {} }: SystemSearchParams = {}): Promise<FhirResource> {
    const searchPath = options.postSearch ? '/_search' : '/';
    return this.baseSearch({ searchPath, searchParams, options });
  }

  /** Search within a compartment. */
  compartmentSearch({ resourceType, compartment, searchParams, options = {} }: CompartmentSearchParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    if (!validResourceType(compartment.resourceType)) throw new Error(`Invalid compartment resourceType: ${compartment.resourceType}`);

    let searchPath = `/${compartment.resourceType}/${compartment.id}/${resourceType}`;
    if (options.postSearch) searchPath += '/_search';
    return this.baseSearch({ searchPath, searchParams, options });
  }

  private baseSearch({
    searchPath,
    searchParams,
    options = {},
  }: {
    searchPath: string;
    searchParams?: SearchParams;
    options?: RequestOptions;
  }): Promise<FhirResource> {
    if (options.postSearch) {
      const query = createQueryString(searchParams) ?? '';
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded', ...options.headers };
      return this.httpClient.post(searchPath, query, { ...options, headers });
    }

    const query = createQueryString(searchParams);
    const url = query ? `${searchPath}?${query}` : searchPath;
    return this.httpClient.get(url, options);
  }

  /** Retrieve history. Routes to instance, type, or system history. */
  history({ resourceType, id, options }: HistoryParams = {}): Promise<FhirResource> {
    if (resourceType && !validResourceType(resourceType)) {
      throw new Error(`Invalid resourceType: ${resourceType}`);
    }

    if (id && resourceType) return this.resourceHistory({ resourceType, id, options });
    if (resourceType) return this.typeHistory({ resourceType, options });
    return this.systemHistory({ options });
  }

  /** Instance-level history. */
  resourceHistory({ resourceType, id, options }: { resourceType: string; id: string; options?: RequestOptions }): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.get(`${resourceType}/${id}/_history`, options);
  }

  /** Type-level history. */
  typeHistory({ resourceType, options }: { resourceType: string; options?: RequestOptions }): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.get(`${resourceType}/_history`, options);
  }

  /** System-level history. */
  systemHistory({ options }: { options?: RequestOptions } = {}): Promise<FhirResource> {
    return this.httpClient.get('/_history', options);
  }
}
