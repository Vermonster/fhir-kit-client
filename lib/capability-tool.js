/**
* Class for checking capability and resource support in a capability statement
*
*/
class CapabilityTool {
  /**
  * Access capabilities
  *
  * @param {Object} capabilityStatement - capability statement FHIR resource
  */
  constructor(capabilityStatement) {
    this.capabilityStatement = capabilityStatement;
    [this.serverCapabilities] = capabilityStatement.rest;
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
      capabilities = this.serverCapabilities;
    }

    if (!capabilities) { return false; }

    const capability = capabilities[capabilityType];

    if (where && capability) {
      const whereParam = Object.keys(where)[0];
      const serverCapability = capability.find(capabilityItem => (
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
    if (resourceCapabilities === undefined) { return false; }
    return resourceCapabilities.interaction.map(interaction => (interaction.code));
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
    if (resourceCapabilities === undefined) { return false; }
    return resourceCapabilities.searchParam.map(param => (param.name));
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
    const serverResources = this.serverCapabilities.resource;
    const resource = serverResources.find(serverResource => (
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
}

module.exports = CapabilityTool;
