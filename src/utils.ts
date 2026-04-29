import { fhirReferenceRegEx } from './fhir-regular-expressions.js';
import type { SearchParams } from './types.js';

export interface SplitReference {
  baseUrl?: string;
  resourceType: string;
  id: string;
}

/**
 * Split a FHIR reference into its baseUrl (if present), resourceType, and id.
 */
export function splitReference(reference: string): SplitReference {
  if (!fhirReferenceRegEx.test(reference)) {
    throw new Error(`${reference} is not a recognized FHIR reference`);
  }

  let baseUrl: string | undefined;
  let relativeReference = reference;

  if (reference.startsWith('http')) {
    const match = fhirReferenceRegEx.exec(reference);
    if (match?.[1]) {
      baseUrl = match[1];
      relativeReference = reference.slice(baseUrl.length);
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
    }
  }

  const [resourceType, id] = relativeReference.split('/') as [string, string];
  return { baseUrl, resourceType, id };
}

/**
 * Return true if the string is a valid FHIR resource type (no leading slash, no colon, non-blank).
 */
export function validResourceType(resourceType: string | undefined | null): boolean {
  if (!resourceType) return false;
  return !resourceType.startsWith('/') && !resourceType.includes(':') && /\S/.test(resourceType);
}

/**
 * Serialize search parameters to a query string using native URLSearchParams.
 * Returns undefined when params is empty.
 */
export function createQueryString(queryParams: SearchParams | undefined): string | undefined {
  if (!queryParams || Object.keys(queryParams).length === 0) return undefined;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, String(v));
      }
    } else {
      params.append(key, String(value));
    }
  }
  return params.toString();
}
