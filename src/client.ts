import { HttpClient } from './http-client.js';
import { Pagination } from './pagination.js';
import { ReferenceResolver } from './reference-resolver.js';
import { authFromCapability, authFromWellKnown } from './smart.js';
import type {
  ClientConfig,
  FhirResource,
  HttpMethod,
  OpPatch,
  RequestOptions,
  SearchParams,
  SmartAuthMetadata,
} from './types.js';
import { createQueryString, validResourceType } from './utils.js';

export interface ReadParams {
  resourceType: string;
  id: string;
  options?: RequestOptions;
}

export interface VreadParams {
  resourceType: string;
  id: string;
  version: string;
  options?: RequestOptions;
}

export interface CreateParams {
  resourceType: string;
  body: FhirResource;
  options?: RequestOptions;
}

export interface UpdateParams {
  resourceType: string;
  /** Resource id for a direct update. Mutually exclusive with `searchParams`. */
  id?: string;
  /** Conditional update parameters. Mutually exclusive with `id`. */
  searchParams?: SearchParams;
  body: FhirResource;
  options?: RequestOptions;
}

export interface DeleteParams {
  resourceType: string;
  id: string;
  options?: RequestOptions;
}

export interface PatchParams {
  resourceType: string;
  id: string;
  /** Array of RFC 6902 JSON Patch operations. */
  jsonPatch: OpPatch[];
  options?: RequestOptions;
}

export interface BundleParams {
  /**
   * A FHIR Bundle resource. The `Bundle.type` field (`'batch'` or `'transaction'`)
   * determines how the server processes the bundle.
   */
  body: FhirResource;
  options?: RequestOptions;
}

export interface OperationParams {
  /** Operation name with or without leading `$` (e.g. `'$everything'` or `'everything'`). */
  name: string;
  resourceType?: string;
  id?: string;
  method?: 'GET' | 'POST';
  input?: FhirResource | SearchParams;
  options?: RequestOptions;
}

/**
 * Parameters for the top-level {@link Client#search} dispatcher.
 * Provide `compartment + resourceType` for compartment search,
 * `resourceType` alone for type-level search, or just `searchParams` for system search.
 */
export interface SearchCallParams {
  resourceType?: string;
  compartment?: { resourceType: string; id: string };
  searchParams?: SearchParams;
  options?: RequestOptions;
}

export interface ResourceSearchParams {
  resourceType: string;
  searchParams?: SearchParams;
  options?: RequestOptions;
}

export interface SystemSearchParams {
  searchParams?: SearchParams;
  options?: RequestOptions;
}

export interface CompartmentSearchParams {
  resourceType: string;
  compartment: { resourceType: string; id: string };
  searchParams?: SearchParams;
  options?: RequestOptions;
}

export interface HistoryParams {
  resourceType?: string;
  id?: string;
  options?: RequestOptions;
}

export interface PaginationParams {
  bundle: FhirResource & { link: Array<{ relation: string; url: string }> };
  options?: RequestOptions;
}

export interface RawRequestParams {
  method?: HttpMethod;
  options?: RequestOptions;
  body?: unknown;
}

/**
 * FHIR REST client. Provides typed methods for all FHIR interactions.
 *
 * @example
 * ```ts
 * import { Client } from 'fhir-kit-client';
 *
 * const client = new Client({ baseUrl: 'https://r4.smarthealthit.org' });
 * const patient = await client.read({ resourceType: 'Patient', id: '123' });
 * ```
 */
export class Client {
  /** Underlying HTTP client — exposed for advanced use cases. */
  readonly httpClient: HttpClient;
  /** Pagination helper. */
  readonly pagination: Pagination;
  private readonly resolver: ReferenceResolver;

  /**
   * @param config - Client configuration. `baseUrl` is required.
   * @throws If `baseUrl` is blank or not a string.
   */
  constructor(
    { baseUrl, customHeaders, requestOptions, requestSigner, bearerToken }: ClientConfig = {} as ClientConfig,
  ) {
    this.httpClient = new HttpClient({ baseUrl, customHeaders, requestOptions, requestSigner });
    if (bearerToken) {
      this.httpClient.bearerToken = bearerToken;
    }
    this.resolver = new ReferenceResolver(this);
    this.pagination = new Pagination(this.httpClient);
  }

  /**
   * Return the raw `Request` and `Response` objects attached to a FHIR
   * response value by the HTTP layer.
   *
   * @param requestResponse - A FHIR resource returned by any client method.
   * @returns `{ request, response }` — either may be `undefined` for synthetic responses.
   */
  static httpFor(requestResponse: FhirResource): { request: Request | undefined; response: Response | undefined } {
    return {
      request: HttpClient.requestFor(requestResponse),
      response: HttpClient.responseFor(requestResponse),
    };
  }

  /** FHIR server base URL. */
  get baseUrl(): string {
    return this.httpClient.baseUrl;
  }

  set baseUrl(url: string) {
    this.httpClient.baseUrl = url;
  }

  /** Custom headers sent with every request. */
  get customHeaders(): Record<string, string> {
    return this.httpClient.customHeaders;
  }

  set customHeaders(headers: Record<string, string>) {
    this.httpClient.customHeaders = headers;
  }

  /** Set the OAuth2 bearer token used for Authorization headers. */
  set bearerToken(token: string) {
    this.httpClient.bearerToken = token;
  }

  /**
   * Resolve a FHIR reference to a resource.
   *
   * - **Absolute URL** (`http://...`): fetches directly or creates a new client for a foreign base URL.
   * - **Relative URL** (`Patient/123`): fetches from this client's `baseUrl`.
   * - **Contained reference** (`#id`): resolved from `context.contained[]`.
   * - **Bundle-scoped reference**: resolved from `context.entry[].fullUrl`.
   *
   * @param params.reference - The reference string to resolve.
   * @param params.context - Optional Bundle or resource that may contain the referenced resource.
   * @param params.options - Per-request options.
   * @returns The resolved FHIR resource.
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
   * Fetch SMART OAuth 2.0 authorization metadata from the server.
   *
   * Races three sources simultaneously and resolves with the first successful
   * response: `.well-known/smart-configuration`, `metadata` (CapabilityStatement),
   * and `.well-known/openid-configuration`. Rejects only if all three fail.
   *
   * @param params.options - Per-request options.
   * @returns SMART auth metadata containing `authorizeUrl`, `tokenUrl`, etc.
   */
  async smartAuthMetadata({ options = {} }: { options?: RequestOptions } = {}): Promise<SmartAuthMetadata> {
    const fetchOptions: RequestOptions = {
      ...options,
      headers: { accept: 'application/fhir+json,application/json', ...options.headers },
    };

    const base = this.baseUrl.replace(/\/*$/, '/');
    const controllers = Array.from({ length: 3 }, () => new AbortController());
    const abortOthers = (winner: number): void =>
      controllers.forEach((c, i) => {
        if (i !== winner) c.abort();
      });

    return Promise.any([
      this.httpClient
        .request('GET', `${base}.well-known/smart-configuration`, { ...fetchOptions, signal: controllers[0].signal })
        .then((r) => {
          abortOthers(0);
          return authFromWellKnown(r);
        }),
      this.capabilityStatement({ ...fetchOptions, signal: controllers[1].signal }).then((r) => {
        abortOthers(1);
        return authFromCapability(r);
      }),
      this.httpClient
        .request('GET', `${base}.well-known/openid-configuration`, { ...fetchOptions, signal: controllers[2].signal })
        .then((r) => {
          abortOthers(2);
          return authFromWellKnown(r);
        }),
    ]);
  }

  /**
   * Fetch the server's CapabilityStatement.
   *
   * @param options - Per-request options.
   * @returns The CapabilityStatement resource.
   */
  capabilityStatement(options?: RequestOptions): Promise<FhirResource> {
    return this.httpClient.get('metadata', options);
  }

  /**
   * Execute a raw request against the FHIR server. Useful for endpoints not
   * covered by higher-level methods.
   *
   * @param requestUrl - Path or absolute URL to request.
   * @param params.method - HTTP method (default: `'GET'`).
   * @param params.options - Per-request options.
   * @param params.body - Request body (will be JSON-serialized if an object).
   * @returns The parsed FHIR response.
   *
   * @example
   * ```ts
   * client.request('Patient/123')
   * client.request('Patient/123', { method: 'DELETE' })
   * client.request('Patient', { method: 'POST', body: newPatient })
   * ```
   */
  request(requestUrl: string, { method = 'GET', options = {}, body }: RawRequestParams = {}): Promise<FhirResource> {
    return this.httpClient.request(method, requestUrl, options, body);
  }

  /**
   * Read a resource by type and id (FHIR `read` interaction).
   *
   * @param params.resourceType - FHIR resource type (e.g. `'Patient'`).
   * @param params.id - Resource id.
   * @param params.options - Per-request options.
   * @returns The requested resource.
   * @throws If `resourceType` is invalid or the server returns an error.
   */
  read({ resourceType, id, options }: ReadParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.get(`${resourceType}/${id}`, options);
  }

  /**
   * Read a specific version of a resource (FHIR `vread` interaction).
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.id - Resource id.
   * @param params.version - Version id.
   * @param params.options - Per-request options.
   * @returns The specified version of the resource.
   * @throws If `resourceType` is invalid or the server returns an error.
   */
  vread({ resourceType, id, version, options }: VreadParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.get(`${resourceType}/${id}/_history/${version}`, options);
  }

  /**
   * Create a new resource (FHIR `create` interaction).
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.body - The resource to create.
   * @param params.options - Per-request options.
   * @returns The created resource (with server-assigned id).
   * @throws If `resourceType` is invalid or the server returns an error.
   */
  create({ resourceType, body, options }: CreateParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.post(resourceType, body, options);
  }

  /**
   * Delete a resource by type and id (FHIR `delete` interaction).
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.id - Resource id.
   * @param params.options - Per-request options.
   * @returns The server's response (often an OperationOutcome).
   * @throws If `resourceType` is invalid or the server returns an error.
   */
  delete({ resourceType, id, options }: DeleteParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.delete(`${resourceType}/${id}`, options);
  }

  /**
   * Update a resource (FHIR `update` interaction).
   *
   * Supports conditional update via `searchParams` (sets the `If-Match`
   * criteria). Provide either `id` or `searchParams`, not both.
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.id - Resource id (mutually exclusive with `searchParams`).
   * @param params.searchParams - Conditional update criteria (mutually exclusive with `id`).
   * @param params.body - The updated resource.
   * @param params.options - Per-request options.
   * @returns The updated resource.
   * @throws If `resourceType` is invalid, both or neither of `id`/`searchParams` are provided,
   *   or the server returns an error.
   */
  update({ resourceType, id, searchParams, body, options }: UpdateParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    if (id && searchParams) throw new Error('Cannot specify both id and searchParams for update');
    if (!id && !searchParams) throw new Error('update requires either id or searchParams');

    if (searchParams) {
      const query = createQueryString(searchParams);
      return this.httpClient.put(`${resourceType}?${query}`, body, options);
    }
    return this.httpClient.put(`${resourceType}/${id}`, body, options);
  }

  /**
   * Patch a resource using JSON Patch (RFC 6902) (FHIR `patch` interaction).
   *
   * Sends `Content-Type: application/json-patch+json`.
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.id - Resource id.
   * @param params.jsonPatch - Array of RFC 6902 patch operations.
   * @param params.options - Per-request options.
   * @returns The patched resource.
   * @throws If `resourceType` is invalid or the server returns an error.
   */
  patch({ resourceType, id, jsonPatch, options = {} }: PatchParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    const headers = { ...options.headers, 'Content-Type': 'application/json-patch+json' };
    return this.httpClient.patch(`${resourceType}/${id}`, jsonPatch, { ...options, headers });
  }

  /**
   * Submit a batch Bundle (FHIR `batch` interaction).
   *
   * The `body.type` field must be `'batch'`. Each entry is processed
   * independently; partial failures are reported per-entry in the response.
   *
   * @param params.body - A FHIR Bundle resource with `type: 'batch'`.
   * @param params.options - Per-request options.
   * @returns The batch response Bundle.
   */
  batch({ body, options }: BundleParams): Promise<FhirResource> {
    return this.httpClient.post('/', body, options);
  }

  /**
   * Submit a transaction Bundle (FHIR `transaction` interaction).
   *
   * The `body.type` field must be `'transaction'`. All entries succeed or
   * fail together (atomic).
   *
   * @param params.body - A FHIR Bundle resource with `type: 'transaction'`.
   * @param params.options - Per-request options.
   * @returns The transaction response Bundle.
   */
  transaction({ body, options }: BundleParams): Promise<FhirResource> {
    return this.httpClient.post('/', body, options);
  }

  /**
   * Invoke a FHIR operation (`$name`) at the system, type, or instance level.
   *
   * @param params.name - Operation name with or without leading `$`.
   * @param params.resourceType - Scopes the operation to a resource type (type/instance level).
   * @param params.id - Scopes the operation to a specific instance (instance level).
   * @param params.method - `'GET'` or `'POST'` (default: `'POST'`).
   * @param params.input - Parameters resource (POST) or query parameters (GET).
   * @param params.options - Per-request options.
   * @returns The operation output resource.
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

  /**
   * Return the next page of a Bundle search result.
   *
   * @param params.bundle - A Bundle with a `link` array containing a `next` relation.
   * @param params.options - Per-request options.
   * @returns The next page Bundle, or `undefined` if there is no next page.
   */
  nextPage({ bundle, options }: PaginationParams): Promise<FhirResource> | undefined {
    return this.pagination.nextPage(bundle, options);
  }

  /**
   * Return the previous page of a Bundle search result.
   *
   * @param params.bundle - A Bundle with a `link` array containing a `previous` relation.
   * @param params.options - Per-request options.
   * @returns The previous page Bundle, or `undefined` if there is no previous page.
   */
  prevPage({ bundle, options }: PaginationParams): Promise<FhirResource> | undefined {
    return this.pagination.prevPage(bundle, options);
  }

  /**
   * Search for resources. Dispatches to the appropriate search variant based on parameters:
   *
   * - `compartment + resourceType` → compartment search
   * - `resourceType` only → type-level search
   * - `searchParams` only → system-wide search
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.compartment - Compartment `{ resourceType, id }`.
   * @param params.searchParams - Search query parameters.
   * @param params.options - Per-request options. Set `postSearch: true` to use POST.
   * @returns A search result Bundle.
   * @throws If `resourceType` is invalid or insufficient parameters are provided.
   */
  search({ resourceType, compartment, searchParams, options }: SearchCallParams = {}): Promise<FhirResource> {
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

  /**
   * Search within a specific resource type (FHIR type-level search).
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.searchParams - Query parameters.
   * @param params.options - Per-request options. Set `postSearch: true` to POST to `_search`.
   * @returns A search result Bundle.
   */
  resourceSearch({ resourceType, searchParams, options = {} }: ResourceSearchParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    const searchPath = options.postSearch ? `${resourceType}/_search` : resourceType;
    return this.baseSearch({ searchPath, searchParams, options });
  }

  /**
   * System-wide search across all resource types.
   *
   * @param params.searchParams - Query parameters.
   * @param params.options - Per-request options. Set `postSearch: true` to POST to `/_search`.
   * @returns A search result Bundle.
   */
  systemSearch({ searchParams, options = {} }: SystemSearchParams = {}): Promise<FhirResource> {
    const searchPath = options.postSearch ? '/_search' : '/';
    return this.baseSearch({ searchPath, searchParams, options });
  }

  /**
   * Search within a FHIR compartment.
   *
   * @param params.resourceType - Resource type to search within the compartment.
   * @param params.compartment - Compartment `{ resourceType, id }`.
   * @param params.searchParams - Query parameters.
   * @param params.options - Per-request options.
   * @returns A search result Bundle.
   */
  compartmentSearch({
    resourceType,
    compartment,
    searchParams,
    options = {},
  }: CompartmentSearchParams): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    if (!validResourceType(compartment.resourceType)) {
      throw new Error(`Invalid compartment resourceType: ${compartment.resourceType}`);
    }

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

  /**
   * Retrieve history. Dispatches to instance-, type-, or system-level history
   * based on the parameters provided.
   *
   * @param params.resourceType - Scopes to type or instance history.
   * @param params.id - Combined with `resourceType` for instance history.
   * @param params.options - Per-request options.
   * @returns A history Bundle.
   */
  history({ resourceType, id, options }: HistoryParams = {}): Promise<FhirResource> {
    if (resourceType && !validResourceType(resourceType)) {
      throw new Error(`Invalid resourceType: ${resourceType}`);
    }

    if (id && resourceType) return this.resourceHistory({ resourceType, id, options });
    if (resourceType) return this.typeHistory({ resourceType, options });
    return this.systemHistory({ options });
  }

  /**
   * Instance-level history for a specific resource.
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.id - Resource id.
   * @param params.options - Per-request options.
   * @returns A history Bundle.
   */
  resourceHistory({
    resourceType,
    id,
    options,
  }: {
    resourceType: string;
    id: string;
    options?: RequestOptions;
  }): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.get(`${resourceType}/${id}/_history`, options);
  }

  /**
   * Type-level history for all instances of a resource type.
   *
   * @param params.resourceType - FHIR resource type.
   * @param params.options - Per-request options.
   * @returns A history Bundle.
   */
  typeHistory({ resourceType, options }: { resourceType: string; options?: RequestOptions }): Promise<FhirResource> {
    if (!validResourceType(resourceType)) throw new Error(`Invalid resourceType: ${resourceType}`);
    return this.httpClient.get(`${resourceType}/_history`, options);
  }

  /**
   * System-level history across all resource types.
   *
   * @param params.options - Per-request options.
   * @returns A history Bundle.
   */
  systemHistory({ options }: { options?: RequestOptions } = {}): Promise<FhirResource> {
    return this.httpClient.get('/_history', options);
  }
}
