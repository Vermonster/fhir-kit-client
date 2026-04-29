import type { FhirResource, RequestOptions } from './types.js';
import { splitReference } from './utils.js';

/**
 * Resolves FHIR References. Used internally by Client.
 */
export class ReferenceResolver {
  private readonly client: {
    baseUrl: string;
    httpClient: { get: (url: string, options?: RequestOptions) => Promise<FhirResource> };
    read: (params: { resourceType: string; id: string; options?: RequestOptions }) => Promise<FhirResource>;
  };

  constructor(client: ReferenceResolver['client']) {
    this.client = client;
  }

  async resolve({
    reference,
    context,
    options,
  }: {
    reference: string;
    context?: FhirResource;
    options?: RequestOptions;
  }): Promise<FhirResource> {
    if (context === undefined) {
      if (reference.startsWith('http')) {
        return this.resolveAbsoluteReference(reference, options);
      }
      return this.client.httpClient.get(reference, options);
    }

    if (reference.startsWith('#')) {
      return this.resolveContainedReference(reference, context);
    }

    return this.resolveBundleReference(reference, context, options);
  }

  private async resolveAbsoluteReference(reference: string, options?: RequestOptions): Promise<FhirResource> {
    if (reference.startsWith(this.client.baseUrl)) {
      return this.client.httpClient.get(reference, options);
    }
    const { baseUrl, resourceType, id } = splitReference(reference);
    const { Client } = await import('./client.js');
    return new Client({ baseUrl: baseUrl! }).read({ resourceType, id, options });
  }

  private resolveContainedReference(reference: string, context: FhirResource): FhirResource {
    const contained = context['contained'] as FhirResource[] | undefined;
    if (contained) {
      const referenceId = reference.slice(1);
      const resource = contained.find((r) => r['id'] === referenceId);
      if (resource) return resource;
    }
    throw new Error(`Unable to resolve contained reference: ${reference}`);
  }

  private async resolveBundleReference(
    reference: string,
    bundle: FhirResource,
    options?: RequestOptions,
  ): Promise<FhirResource> {
    const entries = bundle['entry'] as Array<{ fullUrl?: string; resource?: FhirResource }> | undefined;
    const referenceRegEx = new RegExp(`(^|/)${reference}$`);
    const entry = entries?.find((e) => e.fullUrl && referenceRegEx.test(e.fullUrl));

    if (!entry?.resource) {
      return this.resolve({ reference, options });
    }
    return entry.resource;
  }
}
