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
export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  headers?: Record<string, string>;
  postSearch?: boolean;
  signal?: AbortSignal;
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
interface AddPatch extends Patch {
  op: 'add';
  value: unknown;
}
interface RemovePatch extends Patch {
  op: 'remove';
}
interface ReplacePatch extends Patch {
  op: 'replace';
  value: unknown;
}
interface MovePatch extends Patch {
  op: 'move';
  from: string;
}
interface CopyPatch extends Patch {
  op: 'copy';
  from: string;
}
interface TestPatch extends Patch {
  op: 'test';
  value: unknown;
}

export type OpPatch = AddPatch | RemovePatch | ReplacePatch | MovePatch | CopyPatch | TestPatch;
