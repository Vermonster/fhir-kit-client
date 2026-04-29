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

/**
 * A filter used by {@link CapabilityTool.supportFor} to narrow the capability
 * search to a specific interaction code or search-parameter name.
 */
export type CapabilityWhere = { code: string } | { name: string };

/**
 * Parameters accepted by {@link CapabilityTool.supportFor}.
 */
export interface SupportForParams {
  /** Limit the search to a specific resource type. Omit for server-level checks. */
  resourceType?: string;
  /** The capability category to inspect, e.g. `'interaction'` or `'searchParam'`. */
  capabilityType: string;
  /** Optional filter to match a specific code or name within the category. */
  where?: CapabilityWhere;
}

/**
 * Inspect a FHIR CapabilityStatement for server and resource capabilities.
 *
 * @example
 * const capabilities = new CapabilityTool(capabilityStatement);
 *
 * // Check resource-level interaction
 * capabilities.resourceCan('Patient', 'read'); // true | false
 *
 * // General capability check
 * capabilities.supportFor({ resourceType: 'Patient', capabilityType: 'interaction', where: { code: 'read' } });
 */
export class CapabilityTool {
  private readonly capabilityStatement: FhirResource;

  constructor(capabilityStatement: FhirResource) {
    this.capabilityStatement = capabilityStatement;
  }

  /**
   * Check whether a server-level interaction is supported.
   *
   * @param interaction - Interaction code (e.g. `'transaction'`, `'batch'`).
   * @returns `true` if the server advertises the interaction.
   */
  serverCan(interaction: string): boolean {
    return this.supportFor({ capabilityType: 'interaction', where: { code: interaction } });
  }

  /**
   * Check whether a resource-level interaction is supported.
   *
   * @param resource - FHIR resource type (e.g. `'Patient'`).
   * @param interaction - Interaction code (e.g. `'read'`, `'search-type'`).
   * @returns `true` if the resource advertises the interaction.
   */
  resourceCan(resource: string, interaction: string): boolean {
    return this.supportFor({ resourceType: resource, capabilityType: 'interaction', where: { code: interaction } });
  }

  /**
   * Check whether a server-level search parameter is supported.
   *
   * @param searchParam - Search parameter name.
   * @returns `true` if the server advertises the search parameter.
   */
  serverSearch(searchParam: string): boolean {
    return this.supportFor({ capabilityType: 'searchParam', where: { name: searchParam } });
  }

  /**
   * Check whether a resource-level search parameter is supported.
   *
   * @param resource - FHIR resource type.
   * @param searchParam - Search parameter name.
   * @returns `true` if the resource advertises the search parameter.
   */
  resourceSearch(resource: string, searchParam: string): boolean {
    return this.supportFor({ resourceType: resource, capabilityType: 'searchParam', where: { name: searchParam } });
  }

  /**
   * General capability check. Returns `true` if the specified capability
   * exists (optionally filtered by a `where` clause).
   *
   * @param params - Capability lookup parameters.
   * @returns `true` if the capability is found.
   */
  supportFor(params?: SupportForParams): boolean {
    const { resourceType, capabilityType, where } = params ?? {};

    if (!capabilityType) return false;

    const capabilities = resourceType ? this.resourceCapabilities({ resourceType }) : this.serverCapabilities();
    if (!capabilities) return false;

    const capability = capabilities[capabilityType] as CapabilityItem[] | undefined;

    if (where && capability) {
      const whereKey = Object.keys(where)[0] as keyof typeof where;
      return capability.some((item) => item[whereKey] === (where as Record<string, string>)[whereKey]);
    }

    return capability !== undefined;
  }

  /**
   * List interaction codes supported by a resource type.
   *
   * @param params - `{ resourceType }` — the resource type to inspect.
   * @returns Array of interaction code strings (e.g. `['read', 'search-type']`).
   */
  interactionsFor(params?: { resourceType: string }): string[] {
    const { resourceType } = params ?? {};
    const caps = resourceType ? this.resourceCapabilities({ resourceType }) : undefined;
    if (!caps?.interaction) return [];
    return caps.interaction.map((i) => i.code ?? '');
  }

  /**
   * List search parameter names supported by a resource type.
   *
   * @param params - `{ resourceType }` — the resource type to inspect.
   * @returns Array of search parameter name strings.
   */
  searchParamsFor(params?: { resourceType: string }): string[] {
    const { resourceType } = params ?? {};
    const caps = resourceType ? this.resourceCapabilities({ resourceType }) : undefined;
    if (!caps?.searchParam) return [];
    return caps.searchParam.map((p) => p.name ?? '');
  }

  /**
   * Return the full capability entry for a given resource type.
   *
   * @param params - `{ resourceType }` — the resource type to look up.
   * @returns The raw capability object, or `undefined` if not found.
   */
  resourceCapabilities(params?: { resourceType: string }): ResourceCapability | undefined {
    const { resourceType } = params ?? {};
    const resources = this.serverCapabilities()?.resource;
    return resources?.find((r) => r.type === resourceType);
  }

  /**
   * Return the raw value of a specific capability category for a resource type.
   *
   * @param params - `{ resourceType, capabilityType }`.
   * @returns The raw capability value (e.g. an array of interaction objects), or `undefined`.
   */
  capabilityContents(params?: { resourceType: string; capabilityType: string }): unknown {
    const { resourceType, capabilityType } = params ?? {};
    if (!resourceType || !capabilityType) return undefined;
    const caps = this.resourceCapabilities({ resourceType });
    return caps?.[capabilityType];
  }

  /**
   * Return the server-mode REST capability block from the CapabilityStatement.
   *
   * @returns The server REST capability, or `undefined` if not present.
   */
  serverCapabilities(): ServerCapability | undefined {
    const rest = this.capabilityStatement.rest as ServerCapability[] | undefined;
    return rest?.find((r) => r.mode === 'server');
  }
}
