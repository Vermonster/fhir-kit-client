/**
* Class for checking capability and resource support in a capability statement.
*
* Use the Capability Tool's high-level convenience methods, `serverCan`, `resourceCan`,
* `serverSearch`, and `resourceSearch`, to quickly determine interaction and
* search capabilities for the server or for a specific resource.
*
* The lower-level `supportFor`, `interactionsFor`, `searchParamsFor`, `resourceCapabilities`,
* `capabilityContents`, `and serverCapabilities` methods may also be used for additional layers
* of compatibility checking and browsing based on a provided capability statement.
*/
class CapabilityTool {
  /**
  * Access capabilities
  *
  * @param {Object} capabilityStatement - capability statement FHIR resource
  */
  constructor(capabilityStatement) {
    this.capabilityStatement = capabilityStatement;
  }

  /**
  * Return server-level interaction support information based on the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const serverBatchSupport = capabilities.serverCan('batch');
  * console.log(serverBatchSupport);
  *
  * @param {String} interaction - The interaction to check server-level capability for.
  *
  * @return {Boolean} Whether or not the interaction is supported by the server.
  */
  serverCan(interaction) {
    return this.supportFor({
      capabilityType: 'interaction',
      where: { code: interaction },
    });
  }

  /**
  * Return resource-level interaction support information based on the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const patientReadSupport = capabilities.resourceCan('Patient', 'read');
  * console.log(patientReadSupport);
  *
  * @param {String} resource - The resource to check interaction support for.
  * @param {String} interaction - The interaction to check resource-level capability for.
  *
  * @return {Boolean} Whether or not the interaction is supported for the given resource.
  */
  resourceCan(resource, interaction) {
    return this.supportFor({
      resourceType: resource,
      capabilityType: 'interaction',
      where: { code: interaction },
    });
  }

  /**
  * Return server-level searchParam support information based on the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const lastUpdatedSupport = capabilities.serverSearch('_lastUpdated');
  * console.log(lastUpdatedSupport);
  *
  * @param {String} searchParam - The searchParam to check server-level capability for.
  *
  * @return {Boolean} Whether or not the searchParam is supported by the server.
  */
  serverSearch(searchParam) {
    return this.supportFor({
      capabilityType: 'searchParam',
      where: { name: searchParam },
    });
  }

  /**
  * Return resource-level searchParam support information based on the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const patientGenderSearchSupport = capabilities.resourceSearch('Patient', 'gender');
  * console.log(patientGenderSearchSupport);
  *
  * @param {String} resource - The resource to check searchParam support for.
  * @param {String} searchParam - The searchParam to check resource-level capability for.
  *
  * @return {Boolean} Whether or not the searchParam is supported for the given resource.
  */
  resourceSearch(resource, searchParam) {
    return this.supportFor({
      resourceType: resource,
      capabilityType: 'searchParam',
      where: { name: searchParam },
    });
  }

  /**
  * Return capability support information based on the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  *
  * // Server-level capability support
  * const interactionSupport = capabilities.supportFor({
  *   capabilityType: 'interaction'
  * });
  * console.log(interactionSupport);
  *
  * // Server-level capability support for specific code
  * const interactionSupport = capabilities.supportFor({
  *   capabilityType: 'interaction',
  *   where: { code: 'history-system' }
  * });
  * console.log(interactionSupport);
  *
  * // Resource-level capability support
  * const patientConditionalCreateSupport = capabilities.supportFor({
  *   resourceType: 'Patient',
  *   capabilityType: 'conditionalCreate'
  * });
  * console.log(patientConditionalCreateSupport);
  *
  * // Capability support for specific code
  * const patientReadSupport = capabilities.supportFor({
  *   resourceType: 'Patient',
  *   capabilityType: 'interaction',
  *   where: { code: 'read' }
  * });
  * console.log(patientReadSupport);
  *
  * // Capability support for specific name
  * const patientBirthDateSearchSupport = capabilities.supportFor({
  *   resourceType: 'Patient',
  *   capabilityType: 'searchParam',
  *   where: { name: 'birthdate' }
  * });
  * console.log(patientBirthDateSearchSupport);
  *
  * @param {Object} params - The capability parameters.
  * @param {String} [params.resourceType] - Resource type (e.g. 'Patient', 'Observation'), optional.
  * @param {Object} params.capabilityType - Capability type (e.g. 'interaction', 'searchParam').
  * @param {Object} [params.where] - Check additional level of compatibility, optional.
  * @param {String} [params.where.code] - Specify a code (e.g., 'read' for interaction), optional.
  * @param {String} [params.where.name] - Specify a name (e.g., 'type' for searchParam), optional.
  *
  * @return {Boolean} If the capability, code, or name is supported for the resource.
  */
  supportFor({ resourceType, capabilityType, where } = {}) {
    let capabilities;
    if (resourceType) {
      capabilities = this.resourceCapabilities({ resourceType });
    } else {
      capabilities = this.serverCapabilities();
    }

    if (!capabilities) { return false; }

    const capability = capabilities[capabilityType];

    if (where && capability) {
      const whereParam = Object.keys(where)[0];
      const serverCapability = capability.find((capabilityItem) => (
        capabilityItem[whereParam] === where[whereParam]
      ));
      return serverCapability !== undefined;
    }

    return capability !== undefined;
  }

  /**
  * Return interactions available for a resource type based on the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const supportedPatientInteractions = capabilities.interactionsFor({ resourceType: 'Patient'});
  * console.log(supportedPatientInteractions);
  *
  * @param {Object} params - The capability parameters.
  * @param {String} params.resourceType - Resource type (e.g. 'Patient', 'Observation').
  *
  * @return {Array} A list of supported interactions for the given resource type.
  */
  interactionsFor({ resourceType } = {}) {
    const resourceCapabilities = this.resourceCapabilities({ resourceType });
    if (resourceCapabilities === undefined) { return []; }
    return resourceCapabilities.interaction.map((interaction) => (interaction.code));
  }

  /**
  * Return searchParams available for a resource type based on the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const supportedPatientSearchParams = capabilities.searchParamsFor({ resourceType: 'Patient'});
  * console.log(supportedPatientSearchParams);
  *
  * @param {Object} params - The capability parameters.
  * @param {String} params.resourceType - Resource type (e.g. 'Patient', 'Observation').
  *
  * @return {Array} A list of supported searchParams for the given resource type.
  */
  searchParamsFor({ resourceType } = {}) {
    const resourceCapabilities = this.resourceCapabilities({ resourceType });
    if (resourceCapabilities === undefined) { return []; }
    if (resourceCapabilities.searchParam === undefined) { return []; }
    return resourceCapabilities.searchParam.map((param) => (param.name));
  }

  /**
  * Return all capabilities for a given resource from the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const patientCapabilities = capabilities.resourceCapabilities({ resourceType: 'Patient'});
  * console.log(patientCapabilities);
  *
  * @param {Object} params - The capability parameters.
  * @param {String} params.resourceType - Resource type (e.g. 'Patient', 'Observation').
  *
  * @return {*} The contents of a given resource as listed in the capability statement.
  */
  resourceCapabilities({ resourceType } = {}) {
    const serverResources = this.serverCapabilities().resource;
    const resource = serverResources.find((serverResource) => (
      serverResource.type === resourceType
    ));

    return resource;
  }

  /**
  * Return the contents of a specific resource capability from the capability statement.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const conditionalDeleteSupport = capabilities.capabilityContents({
  *   resourceType: 'Patient',
  *   capabilityType: 'conditionalDelete'
  * });
  * console.log(conditionalDeleteSupport);
  *
  * @param {Object} params - The capability parameters.
  * @param {String} params.resourceType - Resource type (e.g. 'Patient', 'Observation').
  * @param {Object} params.capabilityType - Capability type (e.g. 'interaction', 'searchParam').
  *
  * @return {*} The contents of a given capability as listed in the capability statement.
  */
  capabilityContents({ resourceType, capabilityType } = {}) {
    const resourceCapabilities = this.resourceCapabilities({ resourceType });
    if (resourceCapabilities === undefined) { return undefined; }
    return resourceCapabilities[capabilityType];
  }

  /**
  * Return all server-level capabilities.
  *
  * @example
  *
  * const capabilities = new CapabilityTool(capabilityStatement);
  * const serverCapabilities = capabilities.serverCapabilities();
  * console.log(serverCapabilities);
  *
  *
  * @return {*} All REST capabilities for the mode 'server'.
  */
  serverCapabilities() {
    return this.capabilityStatement.rest.find((capabilities) => (
      capabilities.mode === 'server'
    ));
  }
}

module.exports = CapabilityTool;
