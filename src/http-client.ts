import HttpAgent from 'agentkeepalive';
import { logRequestError, logRequestInfo, logResponseInfo } from './logging.js';
import type { FhirResource, RequestOptions, SignalLike } from './types.js';
import { REQUEST_KEY, RESPONSE_KEY } from './types.js';

const { HttpsAgent } = HttpAgent;

const defaultHeaders: Record<string, string> = { accept: 'application/fhir+json' };

interface AgentOptions {
  agent?: InstanceType<typeof HttpAgent> | InstanceType<typeof HttpsAgent>;
}

/**
 * Ensures the signal is a native AbortSignal.
 *
 * On Node 24+, undici's Request constructor enforces a strict
 * `instanceof AbortSignal` check. Polyfill libraries such as
 * `node-abort-controller` create their own AbortSignal class that is NOT
 * the native one, causing a TypeError at request-build time. We bridge any
 * foreign signal to a native AbortController so undici is always satisfied.
 *
 * See: https://github.com/Vermonster/fhir-kit-client/issues/204
 */
function normalizeSignal(signal: SignalLike): AbortSignal {
  if (signal instanceof AbortSignal) return signal;

  const controller = new AbortController();
  if (signal.aborted) {
    controller.abort(signal.reason);
  } else {
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

function stringifyBody(body: unknown): string | undefined {
  if (body === undefined) return undefined;
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

function lcKeys(obj: Record<string, string> | undefined): Record<string, string> {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

interface ResponseErrorConfig {
  status: number;
  data: unknown;
  method: string;
  headers: unknown;
  url: string;
}

function buildResponseError(
  config: ResponseErrorConfig,
): Error & { response: { status: number; data: unknown }; config: ResponseErrorConfig } {
  const error = Object.assign(new Error(`HTTP ${config.status}: ${config.method} ${config.url}`), {
    response: { status: config.status, data: config.data },
    config,
  });
  logRequestError(error);
  return error;
}

/**
 * Internal HTTP client. Use Client methods instead of this class directly.
 */
export class HttpClient {
  private baseUrlValue: string;
  customHeaders: Record<string, string>;
  private readonly baseRequestOptions: Record<string, unknown>;
  private readonly requestSigner?: (url: string, options: RequestInit) => void;
  private authHeader: Record<string, string> = {};
  /** Keepalive agents keyed by base URL, reused across requests on this instance. */
  private readonly agentCache = new Map<string, AgentOptions>();

  constructor({
    baseUrl,
    customHeaders = {},
    requestOptions = {},
    requestSigner,
  }: {
    baseUrl: string;
    customHeaders?: Record<string, string>;
    requestOptions?: Record<string, unknown>;
    requestSigner?: (url: string, options: RequestInit) => void;
  }) {
    this.baseUrlValue = '';
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders;
    this.baseRequestOptions = requestOptions;
    this.requestSigner = requestSigner;
  }

  set baseUrl(url: string) {
    if (!url) throw new Error('baseUrl cannot be blank');
    if (typeof url !== 'string') throw new Error('baseUrl must be a string');
    this.baseUrlValue = url;
  }

  get baseUrl(): string {
    return this.baseUrlValue;
  }

  set bearerToken(token: string) {
    this.authHeader = { authorization: `Bearer ${token}` };
  }

  static responseFor(requestResponse: FhirResource): Response | undefined {
    return (requestResponse as unknown as Record<string, unknown>)[RESPONSE_KEY] as Response | undefined;
  }

  static requestFor(requestResponse: FhirResource): Request | undefined {
    return (requestResponse as unknown as Record<string, unknown>)[REQUEST_KEY] as Request | undefined;
  }

  private mergeHeaders(requestHeaders?: Record<string, string>): Record<string, string> {
    return {
      ...lcKeys(defaultHeaders),
      ...lcKeys(this.authHeader),
      ...lcKeys(this.customHeaders),
      ...lcKeys(requestHeaders),
    };
  }

  private buildAgent(): AgentOptions {
    const cached = this.agentCache.get(this.baseUrl);
    if (cached) return cached;
    const agent: AgentOptions = this.baseUrl.startsWith('https')
      ? { agent: new HttpsAgent() }
      : { agent: new HttpAgent() };
    this.agentCache.set(this.baseUrl, agent);
    return agent;
  }

  expandUrl(url = ''): string {
    if (url.toLowerCase().startsWith('http')) return url;
    if (this.baseUrl.endsWith('/') && url.startsWith('/')) return this.baseUrl + url.slice(1);
    if (this.baseUrl.endsWith('/') || url.startsWith('/')) return this.baseUrl + url;
    return `${this.baseUrl}/${url}`;
  }

  private buildRequest(method: string, url: string, options: RequestOptions, body?: unknown): Request {
    const requestInit: RequestInit = {
      ...(this.baseRequestOptions as RequestInit),
      method,
      body: stringifyBody(body),
      headers: new Headers(this.mergeHeaders(options.headers)),
      keepalive: true,
      ...this.buildAgent(),
    };

    if (options.signal) requestInit.signal = normalizeSignal(options.signal);

    if (this.requestSigner) {
      this.requestSigner(url, requestInit);
    }

    return new Request(url, requestInit);
  }

  async request(
    method: string,
    requestUrl: string,
    options: RequestOptions = {},
    body?: unknown,
  ): Promise<FhirResource> {
    const url = this.expandUrl(requestUrl);
    const req = this.buildRequest(method, url, options, body);
    logRequestInfo(method, url, req.headers);

    const response = await fetch(req);
    const { status } = response;
    logResponseInfo({ status });

    const bodyText = await response.text();

    let data: unknown = {};
    if (bodyText) {
      try {
        data = JSON.parse(bodyText);
      } catch {
        const err = buildResponseError({ status, data: bodyText, method, headers: response.headers, url });
        throw err;
      }
    }

    if (!response.ok) {
      throw buildResponseError({ status, data, method, headers: response.headers, url });
    }

    const result = data as FhirResource;
    Object.defineProperty(result, RESPONSE_KEY, { writable: false, enumerable: false, value: response });
    Object.defineProperty(result, REQUEST_KEY, { writable: false, enumerable: false, value: req });

    return result;
  }

  async get(url: string, options?: RequestOptions): Promise<FhirResource> {
    return this.request('GET', url, options);
  }

  async delete(url: string, options?: RequestOptions): Promise<FhirResource> {
    return this.request('DELETE', url, options);
  }

  async put(url: string, body: unknown, options: RequestOptions = {}): Promise<FhirResource> {
    const headers = { 'content-type': 'application/fhir+json', ...lcKeys(options.headers) };
    return this.request('PUT', url, { ...options, headers }, body);
  }

  async post(url: string, body: unknown, options: RequestOptions = {}): Promise<FhirResource> {
    const headers = { 'content-type': 'application/fhir+json', ...lcKeys(options.headers) };
    return this.request('POST', url, { ...options, headers }, body);
  }

  async patch(url: string, body: unknown, options: RequestOptions = {}): Promise<FhirResource> {
    return this.request('PATCH', url, options, body);
  }
}
