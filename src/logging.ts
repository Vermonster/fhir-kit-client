import createDebug from 'debug';
import stringify from 'json-stringify-safe';

const errorLogger = createDebug('fhir-kit-client:error');
const infoLogger = createDebug('fhir-kit-client:info');

interface ResponseError {
  response?: { status?: number; data?: unknown };
  config?: { method?: string; url?: string; headers?: unknown };
}

function inspectHeaders(headers: unknown): string {
  if (
    headers !== null &&
    typeof headers === 'object' &&
    'raw' in headers &&
    typeof (headers as Record<string, unknown>)['raw'] === 'function'
  ) {
    return stringify((headers as { raw: () => unknown }).raw());
  }
  return stringify(headers);
}

export function logRequestError(error: ResponseError): void {
  if (!errorLogger.enabled) return;
  errorLogger('!!! Error');
  if (error.response) {
    errorLogger(`    Status: ${error.response.status}`);
  }
  if (error.config) {
    errorLogger(`    ${(error.config.method ?? '').toUpperCase()}: ${error.config.url}`);
    errorLogger(`    Headers: ${inspectHeaders(error.config.headers)}`);
  }
  if (error.response?.data) {
    errorLogger(stringify(error.response.data));
  }
  errorLogger('!!! Request Error');
}

export function logRequestInfo(action: string, url?: string, headers?: unknown): void {
  if (!infoLogger.enabled) return;
  if (url) infoLogger(`Request: ${action.toUpperCase()} ${url}`);
  if (headers !== undefined) infoLogger(`Request Headers: ${inspectHeaders(headers)}`);
}

export function logResponseInfo(response: { status: number; data?: unknown }): void {
  if (!infoLogger.enabled) return;
  infoLogger(`Response: ${response.status}`);
  if (response.data) infoLogger(stringify(response.data));
}

export function logError(error: unknown): void {
  if (!errorLogger.enabled) return;
  errorLogger(error);
}
