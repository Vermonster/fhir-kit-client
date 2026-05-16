export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

export interface FhirResource extends Record<string, unknown> {
  resourceType: string;
}

export interface SmartAuthMetadata {
  authorizeUrl?: URL;
  tokenUrl?: URL;
  registerUrl?: URL;
  manageUrl?: URL;
}

export type SearchParams = Record<string, string | number | boolean | Array<string | number | boolean>>;

export interface Compartment {
  id: string;
  resourceType: string;
}

/** Options passed per-request */
export interface RequestOptions extends Omit<RequestInit, 'method' | 'body' | 'signal'> {
  headers?: Record<string, string>;
  postSearch?: boolean;
  /**
   * Abort signal for the request. Accepts the native `AbortSignal` and
   * duck-typed polyfills such as `node-abort-controller` — see
   * https://github.com/Vermonster/fhir-kit-client/issues/204.
   */
  signal?: SignalLike;
}

/**
 * Minimal duck-typed AbortSignal interface. Accepts both the native
 * `AbortSignal` and polyfills (e.g. `node-abort-controller`) whose signal
 * class is not an `instanceof` the native `AbortSignal`.
 */
export interface SignalLike {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(type: 'abort', listener: () => void, options?: { once?: boolean }): void;
}

/** Constructor config for Client */
export interface ClientConfig {
  baseUrl: string;
  customHeaders?: Record<string, string>;
  requestOptions?: Record<string, unknown>;
  requestSigner?: (url: string, options: RequestInit) => void;
  bearerToken?: string;
}

/** The hidden properties attached to every FHIR response object */
export const RESPONSE_KEY = '__response' as const;
export const REQUEST_KEY = '__request' as const;

/** A FHIR response object with hidden request/response metadata */
export type FhirResponse = FhirResource & {
  [RESPONSE_KEY]?: Response;
  [REQUEST_KEY]?: Request;
};

// JSON Patch types (RFC 6902)
interface Patch {
  path: string;
}
export interface AddPatch extends Patch {
  op: 'add';
  value: unknown;
}
export interface RemovePatch extends Patch {
  op: 'remove';
}
export interface ReplacePatch extends Patch {
  op: 'replace';
  value: unknown;
}
export interface MovePatch extends Patch {
  op: 'move';
  from: string;
}
export interface CopyPatch extends Patch {
  op: 'copy';
  from: string;
}
export interface TestPatch extends Patch {
  op: 'test';
  value: unknown;
}

export type OpPatch = AddPatch | RemovePatch | ReplacePatch | MovePatch | CopyPatch | TestPatch;
