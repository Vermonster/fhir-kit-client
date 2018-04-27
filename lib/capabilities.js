/**
* Class for checking capabilities in a capability statement
*
*/
class Capabilities {
  /**
  * Access capabilities
  *
  * @param {Object} capabilityStatement - capability statement FHIR resource
  */
  constructor(capabilityStatement) {
    this.capabilityStatement = capabilityStatement;
  }

  /**
  * Return capability support information based on the capability statement.
  *
  * @param {Object} params - The capability parameters.
  * @param {String} params.resourceType - Resource type (e.g. 'Patient', 'Observation').
  * @param {Object} params.capabilityType - Capability type (e.g. 'interaction', 'searchParam').
  * @param {Object} params.where - Parameters to check additional level of compatibility, optional.
  * @param {String} params.where.code - Specify a code (e.g., 'read' for interaction), optional.
  * @param {String} params.where.name - Specify a name (e.g., 'address' for searchParam), optional.
  *
  * @return {Boolean|Array} Determination of 'where'-specified capability OR list of capabilities.
  */
  supportFor({ resourceType, capabilityType, where } = {}) {
    const serverResources = this.capabilityStatement.rest[0].resource;
    const resourceSupport = serverResources.find(serverResource => (
      serverResource.type === resourceType
    ));

    if (!resourceSupport) { return false; }

    const capability = resourceSupport[capabilityType];

    if (where) {
      const whereParam = Object.keys(where)[0];
      const serverCapability = capability.find(capabilityItem => (
        capabilityItem[whereParam] === where[whereParam]
      ));
      return serverCapability !== undefined;
    } else if (Array.isArray(capability)) {
      return capability.map(capabilityItem => (
        capabilityItem.code || capabilityItem.name || capabilityItem
      ));
    }

    return capability;
  }
}

module.exports = Capabilities;
