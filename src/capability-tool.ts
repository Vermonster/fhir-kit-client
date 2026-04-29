import type { FhirResource } from './types.js';

interface CapabilityItem extends Record<string, unknown> {
  code?: string;
  name?: string;
}

interface ResourceCapability extends Record<string, unknown> {
  type?: string;
  interaction?: CapabilityItem[];
  searchParam?: CapabilityItem[];
}

interface ServerCapability extends Record<string, unknown> {
  mode?: string;
  resource?: ResourceCapability[];
  interaction?: CapabilityItem[];
  searchParam?: CapabilityItem[];
}

interface SupportForParams {
  resourceType?: string;
  capabilityType: string;
  where?: { code: string } | { name: string };
}

/**
 * Inspect a FHIR CapabilityStatement for server and resource capabilities.
 */
export class CapabilityTool {
  private readonly capabilityStatement: FhirResource;

  constructor(capabilityStatement: FhirResource) {
    this.capabilityStatement = capabilityStatement;
  }

  /** Check whether a server-level interaction is supported. */
  serverCan(interaction: string): boolean {
    return this.supportFor({ capabilityType: 'interaction', where: { code: interaction } });
  }

  /** Check whether a resource-level interaction is supported. */
  resourceCan(resource: string, interaction: string): boolean {
    return this.supportFor({ resourceType: resource, capabilityType: 'interaction', where: { code: interaction } });
  }

  /** Check whether a server-level searchParam is supported. */
  serverSearch(searchParam: string): boolean {
    return this.supportFor({ capabilityType: 'searchParam', where: { name: searchParam } });
  }

  /** Check whether a resource-level searchParam is supported. */
  resourceSearch(resource: string, searchParam: string): boolean {
    return this.supportFor({ resourceType: resource, capabilityType: 'searchParam', where: { name: searchParam } });
  }

  /** General capability check. */
  supportFor({ resourceType, capabilityType, where }: SupportForParams = {} as SupportForParams): boolean {
    const capabilities = resourceType
      ? this.resourceCapabilities({ resourceType })
      : this.serverCapabilities();

    if (!capabilities) return false;

    const capability = capabilities[capabilityType] as CapabilityItem[] | undefined;

    if (where && capability) {
      const whereKey = Object.keys(where)[0] as keyof typeof where;
      return capability.some((item) => item[whereKey] === (where as Record<string, string>)[whereKey]);
    }

    return capability !== undefined;
  }

  /** List interaction codes for a resource type. */
  interactionsFor({ resourceType }: { resourceType: string } = {} as { resourceType: string }): string[] {
    const caps = this.resourceCapabilities({ resourceType });
    if (!caps?.interaction) return [];
    return caps.interaction.map((i) => i.code ?? '');
  }

  /** List search parameter names for a resource type. */
  searchParamsFor({ resourceType }: { resourceType: string } = {} as { resourceType: string }): string[] {
    const caps = this.resourceCapabilities({ resourceType });
    if (!caps?.searchParam) return [];
    return caps.searchParam.map((p) => p.name ?? '');
  }

  /** Return all capabilities for a given resource type. */
  resourceCapabilities({ resourceType }: { resourceType: string } = {} as { resourceType: string }): ResourceCapability | undefined {
    const resources = this.serverCapabilities()?.resource;
    return resources?.find((r) => r.type === resourceType);
  }

  /** Return the value of a specific capability type for a resource. */
  capabilityContents({
    resourceType,
    capabilityType,
  }: {
    resourceType: string;
    capabilityType: string;
  } = {} as { resourceType: string; capabilityType: string }): unknown {
    const caps = this.resourceCapabilities({ resourceType });
    return caps?.[capabilityType];
  }

  /** Return all server-level REST capabilities. */
  serverCapabilities(): ServerCapability | undefined {
    const rest = this.capabilityStatement['rest'] as ServerCapability[] | undefined;
    return rest?.find((r) => r.mode === 'server');
  }
}
