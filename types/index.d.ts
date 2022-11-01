import { OpPatch } from './externals';

type HttpMethods = 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';

interface RequestInitWithoutMethod extends Omit<RequestInit, 'method'> {}

interface RequestResponse {
  request: Request;
  response: Response;
}

interface FhirResource extends Record<string, any> {
  resourceType: ResourceType
}

interface SmartAuthMetadata {
  authorizeUrl?: URL;
  tokenUrl?: URL;
  registerUrl?: URL;
  manageUrl?: URL;
}

interface SearchParams {
  [key: string]: string|number|boolean|Array<string|number|boolean>;
}

interface Compartment  {
  id: string;
  resourceType: string;
}

type ResourceType = string;

/**
 * Access capabilities
 * @param capabilityStatement - capability statement FHIR resource
 */
declare class CapabilityTool {
  constructor(capabilityStatement: FhirResource);
  /**
   * Return server-level interaction support information based on the capability statement.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const serverBatchSupport = capabilities.serverCan('batch');
   * console.log(serverBatchSupport);
   * @param interaction - The interaction to check server-level capability for.
   * @returns Whether or not the interaction is supported by the server.
   */
  serverCan(interaction: string): boolean;
  /**
   * Return resource-level interaction support information based on the capability statement.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const patientReadSupport = capabilities.resourceCan('Patient', 'read');
   * console.log(patientReadSupport);
   * @param resource - The resource to check interaction support for.
   * @param interaction - The interaction to check resource-level capability for.
   * @returns Whether or not the interaction is supported for the given resource.
   */
  resourceCan(resource: string, interaction: string): boolean;
  /**
   * Return server-level searchParam support information based on the capability statement.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const lastUpdatedSupport = capabilities.serverSearch('_lastUpdated');
   * console.log(lastUpdatedSupport);
   * @param searchParam - The searchParam to check server-level capability for.
   * @returns Whether or not the searchParam is supported by the server.
   */
  serverSearch(searchParam: string): boolean;
  /**
   * Return resource-level searchParam support information based on the capability statement.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const patientGenderSearchSupport = capabilities.resourceSearch('Patient', 'gender');
   * console.log(patientGenderSearchSupport);
   * @param resource - The resource to check searchParam support for.
   * @param searchParam - The searchParam to check resource-level capability for.
   * @returns Whether or not the searchParam is supported for the given resource.
   */
  resourceSearch(resource: string, searchParam: string): boolean;
  /**
   * Return capability support information based on the capability statement.
   * @example
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
   * @param params - The capability parameters.
   * @param [params.resourceType] - Resource type (e.g. 'Patient', 'Observation'), optional.
   * @param params.capabilityType - Capability type (e.g. 'interaction', 'searchParam').
   * @param [params.where] - Check additional level of compatibility, optional.
   * @param [params.where.code] - Specify a code (e.g., 'read' for interaction), optional.
   * @param [params.where.name] - Specify a name (e.g., 'type' for searchParam), optional.
   * @returns If the capability, code, or name is supported for the resource.
   */
  supportFor(params: {
    resourceType?: ResourceType;
    capabilityType: string;
    where?: {
      code?: string;
      name?: string;
    };
  }): boolean;
  /**
   * Return interactions available for a resource type based on the capability statement.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const supportedPatientInteractions = capabilities.interactionsFor({ resourceType: 'Patient'});
   * console.log(supportedPatientInteractions);
   * @param params - The capability parameters.
   * @param params.resourceType - Resource type (e.g. 'Patient', 'Observation').
   * @returns A list of supported interactions for the given resource type.
   */
  interactionsFor(params: {
    resourceType: ResourceType;
  }): string[];
  /**
   * Return searchParams available for a resource type based on the capability statement.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const supportedPatientSearchParams = capabilities.searchParamsFor({ resourceType: 'Patient'});
   * console.log(supportedPatientSearchParams);
   * @param params - The capability parameters.
   * @param params.resourceType - Resource type (e.g. 'Patient', 'Observation').
   * @returns A list of supported searchParams for the given resource type.
   */
  searchParamsFor(params: {
    resourceType: ResourceType;
  }): string[];
  /**
   * Return all capabilities for a given resource from the capability statement.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const patientCapabilities = capabilities.resourceCapabilities({ resourceType: 'Patient'});
   * console.log(patientCapabilities);
   * @param params - The capability parameters.
   * @param params.resourceType - Resource type (e.g. 'Patient', 'Observation').
   * @returns The contents of a given resource as listed in the capability statement.
   */
  resourceCapabilities(params: {
    resourceType: ResourceType;
  }): any;
  /**
   * Return the contents of a specific resource capability from the capability statement.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const conditionalDeleteSupport = capabilities.capabilityContents({
   *   resourceType: 'Patient',
   *   capabilityType: 'conditionalDelete'
   * });
   * console.log(conditionalDeleteSupport);
   * @param params - The capability parameters.
   * @param params.resourceType - Resource type (e.g. 'Patient', 'Observation').
   * @param params.capabilityType - Capability type (e.g. 'interaction', 'searchParam').
   * @returns The contents of a given capability as listed in the capability statement.
   */
  capabilityContents(params: {
    resourceType: ResourceType;
    capabilityType: any;
  }): any;
  /**
   * Return all server-level capabilities.
   * @example
   * const capabilities = new CapabilityTool(capabilityStatement);
   * const serverCapabilities = capabilities.serverCapabilities();
   * console.log(serverCapabilities);
   * @returns All REST capabilities for the mode 'server'.
   */
  serverCapabilities(): any;
}

/**
 * Create a FHIR client.
 *
 * For details on what requestOptions are available, see the node `request`
 * documentation at https://github.com/request/request
 * @example
 * const options = {
 *   baseUrl: 'http://fhir.com',
 *   customHeaders: {
 *     'x-some-header': 'value'
 *   },
 *   requestOptions: {
 *     cert: certFileContent,
 *     key: keyFileContent,
 *     ca: caFileContent
 *   },
 *   bearerToken: 'eyJhbGci...dQssw5c',
 *   requestSigner: (url, requestOptions) => {
 *      const signed = aws4.sign({
 *        path: requestOptions.path,
 *        service: 'healthlake',
 *        region: 'us-west-2'
 *        method: requestOptions.method
 *      });
 *      Object.keys(signed.headers).forEach((key) => {
 *        requestOptions.headers.set(key, signed[key]);
 *      });
 *    }
 * };
 * };
 *
 * const client = new Client(options);
 * @param config - Client configuration
 * @param config.baseUrl - ISS for FHIR server
 * @param [config.customHeaders] - Optional custom headers to send with
 *   each request
 * @param [config.requestOptions] - Optional custom request options for
 *   instantiating the HTTP connection
 * @param [config.requestSigner] Optional pass in a function to sign the request.
 */
export default class Client {
  baseUrl: string;
  customHeaders: HeadersInit;
  bearerToken: string | undefined;

  constructor(config: {
    baseUrl: string;
    customHeaders?: HeadersInit;
    requestOptions?: RequestInit;
    requestSigner?: (url: string, requestOptions: RequestInit) => void | undefined;
    bearerToken?: string | undefined;
  });
  /**
   * Given a Client response, returns the underlying HTTP request and response
   * objects.
   * @example
   * const Client = require('fhir-kit-client');
   *
   * fhirClient.read({
   *   resourceType: 'Patient',
   *   id: 12345,
   * }).then((data) => {
   *   const { response, request } = Client.httpFor(data);
   *   console.log(response.status);
   *   console.log(request.headers);
   * });
   * @param requestResponse - to one of the FHIR Kit Client requests
   * @returns object containing http request and response
   */
  static httpFor(fhirResource: FhirResource): RequestResponse;
  /**
   * Resolve a reference and return FHIR resource
   *
   * From: http://hl7.org/fhir/STU3/references.html, a reference can be: 1)
   * absolute URL, 2) relative URL or 3) an internal fragement. In the case of
   * (2), there are rules on resolving references that are in a FHIR bundle.
   * @example
   * // Always does a new http request
   * client.resolve({ reference: 'http://test.com/fhir/Patient/1' }).then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Always does a new http request, using the client.baseUrl
   * client.resolve({ reference: 'Patient/1' }).then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Try to resolve a patient in the bundle, otherwise build request
   * // at client.baseUrl
   * client.resolve({ reference: 'Patient/1', context: bundle }).then((patient) => {
   *   console.log(patient);
   * });
   *
   * // Resolve a patient contained in someResource (see:
   * // http://hl7.org/fhir/STU3/references.html#contained)
   * client.resolve({ reference: '#patient-1', context: someResource }).then((patient) => {
   *   console.log(patient);
   * });
   * @param params - The request parameters.
   * @param params.reference - FHIR reference
   * @param [params.context] - Optional bundle or FHIR resource
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resource
   */
  resolve(params: {
    reference: string;
    context?: FhirResource;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource>;
  /**
   * Obtain the SMART OAuth URLs from the Capability Statement, or
   * any of the .well-known addresses.
   *
   * See: http://docs.smarthealthit.org/authorization/conformance-statement/
   * @example
   * // Using promises
   * fhirClient.smartAuthMetadata().then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.smartAuthMetadata();
   * console.log(response);
   * @param [params] - The request parameters.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns contains the following SMART URL: authorizeUrl,
   *   tokenUrl, registerUrl, manageUrl
   */
  smartAuthMetadata(params?: {
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<SmartAuthMetadata>;
  /**
   * Get the capability statement.
   * @example
   * // Using promises
   * fhirClient.capabilityStatement().then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.capabilityStatement();
   * console.log(response);
   * @param [params] - The request parameters.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns capability statement FHIR resource.
   */
  capabilityStatement(params?: {
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource>;
  /**
   * Run a request.
   * @example
   * // Defaults to GET
   * fhirClient.request('Patient/123')
   *   .then(data => console.log(data));
   *
   * fhirClient.request('Patient/123', { method: 'DELETE'})
   *   .then(data => console.log(data));
   *
   * fhirClient.request('Patient', { method: 'POST', body: myNewPatient })
   *   .then(data => console.log(data));
   * @param requestUrl - URL, can be relative to base or absolute
   * @param params - (optional) Request params
   * @param params.method - (optional) HTTP method (defaults to GET)
   * @param params.options - (optional) additional request options (e.g. headers)
   * @param params.body - (optional) request body
   * @returns Response
   */
  request(requestUrl: string, params?: {
    method?: HttpMethods;
    headers?: HeadersInit;
    options?: RequestInitWithoutMethod;
    body?: BodyInit;
  }): Promise<object>;
  /**
   * Get a resource by FHIR id.
   * @example
   * // Using promises
   * fhirClient.read({
   *   resourceType: 'Patient',
   *   id: 12345,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.read({ resourceType: 'Patient', id: 12345 });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param params.id - The FHIR id for the resource.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resource
   */
  read(params: {
    resourceType: ResourceType;
    id: string;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource>;
  /**
   * Get a resource by id and version.
   * @example
   * // Using promises
   * fhirClient.vread({
   *   resourceType: 'Patient',
   *   id: '12345',
   *   version: '1',
   * }).then(data => console.log(data));
   *
   * // Using async
   * let response = await fhirClient.vread({
   *   resourceType: 'Patient',
   *   id: '12345',
   *   version: '1',
   * });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param params.id - The FHIR id for the resource.
   * @param params.version - The version id for the resource.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resource
   */
  vread(params: {
    resourceType: ResourceType;
    id: string;
    version: string;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource>;
  /**
   * Create a resource.
   * @example
   * const newPatient = {
   *   resourceType: 'Patient',
   *   active: true,
   *   name: [{ use: 'official', family: 'Coleman', given: ['Lisa', 'P.'] }],
   *   gender: 'female',
   *   birthDate: '1948-04-14',
   * }
   *
   * // Using promises
   * fhirClient.create({
   *   resourceType: 'Patient',
   *   body: newPatient,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.create({
   *   resourceType: 'Patient',
   *   body: newPatient,
   * })
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The FHIR resource type.
   * @param params.body - The new resource data to create.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resource
   */
  create<T extends FhirResource>(params: {
    resourceType: ResourceType;
    body: T;
    headers?: HeadersInit;
    options?: RequestInit;
   }): Promise<FhirResource | T>;
  /**
   * Delete a resource by FHIR id.
   * @example
   * // Using promises
   * fhirClient.delete({
   *   resourceType: 'Patient',
   *   id: 12345,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.delete({ resourceType: 'Patient', id: 12345 });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient", "Observation").
   * @param params.id - The FHIR id for the resource.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns Operation Outcome FHIR resource
   */
  delete(params: {
    resourceType: ResourceType;
    id: string;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource>;
  /**
   * Update a resource by FHIR id.
   * @example
   * const updatedPatient = {
   *   resourceType: 'Patient',
   *   birthDate: '1948-04-14',
   * }
   *
   * // Using promises
   * fhirClient.update({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   body: updatedPatient,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.update({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   body: updatedPatient,
   * });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param params.id - The FHIR id for the resource.
   * @param params.searchParams - For a conditional update the searchParams are specified instead of the id, see https://www.hl7.org/fhir/http.html#cond-update
   * @param params.body - The resource to be updated.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resource
   */
  update<T extends FhirResource>(params: {
    resourceType: ResourceType;
    id?: string;
    searchParams?: SearchParams;
    body: T;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource | T>
  /**
   * Patch a resource by FHIR id.
   *
   * From http://hl7.org/fhir/STU3/http.html#patch:
   * Content-Type is 'application/json-patch+json'
   * Expects a JSON Patch document format, see http://jsonpatch.com/
   * @example
   * // JSON Patch document format from http://jsonpatch.com/
   * const JSONPatch = [{ op: 'replace', path: '/gender', value: 'male' }];
   *
   * // Using promises
   * fhirClient.patch({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   JSONPatch,
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.patch({
   *   resourceType: 'Patient',
   *   id: 12345,
   *   JSONPatch
   * });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param params.id - The FHIR id for the resource.
   * @param params.JSONPatch - A JSON Patch document containing an array
   *   of patch operations, formatted according to http://jsonpatch.com/.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resource
   */
  patch(params: {
    resourceType: ResourceType;
    id: string;
    JSONPatch: OpPatch[];
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource>;
  /**
   * Submit a set of actions to perform independently as a batch.
   *
   * Update, create or delete a set of resources in a single interaction.
   * There should be no interdependencies between entries in the bundle.
   * @example
   * const requestBundle = {
   *   'resourceType': 'Bundle',
   *   'type': 'batch',
   *   'entry': [
   *    {
   *      'fullUrl': 'http://example.org/fhir/Patient/123',
   *      'resource': {
   *        'resourceType': 'Patient',
   *        'id': '123',
   *        'active': true
   *      },
   *      'request': {
   *        'method': 'PUT',
   *        'url': 'Patient/123'
   *      }
   *    },
   *     {
   *       'request': {
   *         'method': 'DELETE',
   *         'url': 'Patient/2e27c71e-30c8-4ceb-8c1c-5641e066c0a4'
   *       }
   *     },
   *     {
   *       'request': {
   *         'method': 'GET',
   *         'url': 'Patient?name=peter'
   *       }
   *     }
   *   ]
   * }
   *
   * // Using promises
   * fhirClient.batch({
   *   body: requestBundle
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.batch({
   *   body: requestBundle
   * });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.body - The request body with a type of 'batch'.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resources in a FHIR Bundle structure.
   */
  batch(params: {
    body: FhirResource & { type: "batch" };
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource | FhirResource & { type: "batch-response" }>;
  /**
   * Submit a set of actions to perform independently as a transaction.
   *
   * Update, create or delete a set of resources in a single interaction.
   * The entire set of changes should succeed or fail as a single entity.
   * Multiple actions on multiple resources different types may be submitted.
   * The outcome should not depend on the order of the resources loaded.
   * Order of processing actions: DELETE, POST, PUT, and GET.
   * The transaction fails if any resource overlap in DELETE, POST and PUT.
   * @example
   * const requestBundle = {
   *   'resourceType': 'Bundle',
   *   'type': 'transaction',
   *   'entry': [
   *    {
   *      'fullUrl': 'http://example.org/fhir/Patient/123',
   *      'resource': {
   *        'resourceType': 'Patient',
   *        'id': '123',
   *        'active': true
   *      },
   *      'request': {
   *        'method': 'PUT',
   *        'url': 'Patient/123'
   *      }
   *    },
   *     {
   *       'request': {
   *         'method': 'DELETE',
   *         'url': 'Patient/2e27c71e-30c8-4ceb-8c1c-5641e066c0a4'
   *       }
   *     },
   *     {
   *       'request': {
   *         'method': 'GET',
   *         'url': 'Patient?name=peter'
   *       }
   *     }
   *   ]
   * }
   *
   * // Using promises
   * fhirClient.transaction({
   *   body: requestBundle
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.transaction({
   *   body: requestBundle
   * });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.body - The request body with a type of
   *   'transaction'.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resources in a FHIR Bundle structure.
   */
  transaction(params: {
    body: FhirResource & { type: "transaction" };
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource | FhirResource & { type: "transaction-response" }>;
  /**
   * Run a custom FHIR operation on system, resource type or instance level.
   *
   * - To run a system-level operation, omit the resourceType and id parameters.
   * - To run a type-level operatiion, include the resourceType and omit the id parameter.
   * - To run an instance-type operation, include both the resourceType and id.
   * @example
   * client.operation({ resourceType: 'ConceptMap', name: '$apply' }).
   *   then(result => console.log(result).
   *   catch(e => console.error(e));
   *
   *
   * const input = {
   *  system: 'http://hl7.org/fhir/composition-status',
   *  code: 'preliminary',
   *  source: 'http://hl7.org/fhir/ValueSet/composition-status',
   *  target: 'http://hl7.org/fhir/ValueSet/v3-ActStatus'
   * };
   *
   * client.operation({resourceType: 'ConceptMap', name: 'translate', method: 'get', input}).
   *   then(result => console.log(result)).
   *   catch(e => console.error(e));
   * @param params - The request parameters.
   * @param params.name - The name of the operation (will get
   *    prepended with $ if missing.
   * @param [params.resourceType] - Optional The resource type (e.g. "Patient",
   *   "Observation")
   * @param [params.id] - Optional FHIR id for the resource
   * @param [params.method] - Optional The HTTP method (POST or GET, defaults to post)
   * @param [params.input] - Optional input object for the operation
   * @param [params.options] - Optional options object
   * @returns Result of opeartion (e.g. FHIR Parameter)
   */
  operation(params: {
    name: string;
    resourceType?: ResourceType;
    id?: string;
    method?: 'POST' | 'GET' | undefined;
    input?: any;
    options?: RequestInitWithoutMethod;
  }): Promise<FhirResource | any>;
  /**
   * Return the next page of results.
   * @param params - The request parameters. Passing the bundle as the
   *   first parameter is DEPRECATED
   * @param params.bundle - Bundle result of a FHIR search
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @param [headers] - DEPRECATED Optional custom headers to add to
   *   the request
   * @returns FHIR resources in a FHIR Bundle structure.
   */
  nextPage<T extends string>(params: {
    bundle: FhirResource & {type: T};
    options?: RequestInit;
  }): Promise<FhirResource | FhirResource & {type: T}>;
  /**
   * Return the previous page of results.
   * @param params - The request parameters. Passing the bundle as the
   *   first parameter is DEPRECATED
   * @param params.bundle - Bundle result of a FHIR search
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @param [headers] - DEPRECATED Optional custom headers to add to
   *   the request
   * @returns FHIR resources in a FHIR Bundle structure.
   */
  prevPage<T extends string>(params: {
    bundle: FhirResource & {type: T};
    options?: RequestInit;
  }): Promise<FhirResource | FhirResource & {type: T}>;
  /**
   * Search for a FHIR resource, with or without compartments, or the entire
   * system
   * @example
   * // Using promises
   * fhirClient.search({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc', _include: ['Observation:encounter', 'Observation:performer'] },
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.search({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc', _include: ['Observation:encounter', 'Observation:performer'] },
   * });
   * console.log(response);
   * @param params - The request parameters.
   * @param [params.resourceType] - The resource type
   *   (e.g. "Patient", "Observation"), optional.
   * @param [params.compartment] - The search compartment, optional.
   * @param [params.searchParams] - The search parameters, optional.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @param [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   * @returns FHIR resources in a Bundle
   */
   search(params: {
    resourceType: ResourceType;
    compartment?: Compartment;
    searchParams?: SearchParams;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource | FhirResource & { type: "searchset" }>;
  /**
   * Search for a FHIR resource.
   * @example
   * // Using promises
   * fhirClient.resourceSearch({
   *   resourceType: 'Patient',
   *   searchParams: { name: 'Smith' },
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.resourceSearch({
   *   resourceType: 'Patient',
   *   searchParams: { name: 'Smith' },
   * });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param params.searchParams - The search parameters.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @param [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   * @returns FHIR resources in a Bundle
   */
  resourceSearch(params: {
    resourceType: ResourceType;
    searchParams: SearchParams;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource| FhirResource & { type: "searchset" }>;
  /**
   * Search across all FHIR resource types in the system.
   * Only the parameters defined for all resources can be used.
   * @example
   * // Using promises
   * fhirClient.systemSearch({
   *   searchParams: { name: 'smith' }
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.systemSearch({ searchParams: { name: 'smith' } });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.searchParams - The search parameters.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @param [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   * @returns FHIR resources in a Bundle
   */
  systemSearch(params: {
    searchParams: SearchParams;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource| FhirResource & { type: "searchset" }>;
  /**
   * Search for FHIR resources within a compartment.
   * The resourceType and id must be specified.
   * @example
   * // Using promises
   * fhirClient.compartmentSearch({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc' }
   * }).then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.compartmentSearch({
   *   resourceType: 'Observation',
   *   compartment: { resourceType: 'Patient', id: 123 },
   *   searchParams: { code: 'abc' }
   * });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param params.compartment - The search compartment.
   * @param [params.searchParams] - The search parameters, optional.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @param [params.options.postSearch] - if true, all `searchParams`
   *   will be placed in the request body rather than the url, and the search
   *   will use POST rather than GET
   * @returns FHIR resources in a Bundle
   */
  compartmentSearch(params: {
    resourceType: ResourceType,
    compartment: Compartment,
    searchParams?: SearchParams,
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource| FhirResource & { type: "searchset" }> ;
  /**
   * Retrieve the change history for a FHIR resource id, a resource type or the
   * entire system
   * @example
   * // Using promises
   * fhirClient.history({ resourceType: 'Patient', id: '12345' });
   *   .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.history({ resourceType: 'Patient', id: '12345' });
   * console.log(response);
   * @param params - The request parameters.
   * @param [params.resourceType] - The resource type
   *   (e.g. "Patient", "Observation"), optional.
   * @param [params.id] - The FHIR id for the resource, optional.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resources in a FHIR Bundle structure.
   */
  history(params?: {
    resourceType?: ResourceType;
    id?: string;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource| FhirResource & { type: "history" }>;
  /**
   * Retrieve the change history for a particular resource FHIR id.
   * @example
   * // Using promises
   * fhirClient.resourceHistory({ resourceType: 'Patient', id: '12345' });
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.resourceHistory({ resourceType: 'Patient', id: '12345' });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param params.id - The FHIR id for the resource.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resources in a FHIR Bundle structure.
   */
  resourceHistory(params: {
    resourceType: ResourceType,
    id: string,
    headers?: HeadersInit,
    options?: RequestInit;
  }): Promise<FhirResource| FhirResource & { type: "history" }>;
  /**
   * Retrieve the change history for a particular resource type.
   * @example
   * // Using promises
   * fhirClient.typeHistory({ resourceType: 'Patient' });
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.typeHistory({ resourceType: 'Patient' });
   * console.log(response);
   * @param params - The request parameters.
   * @param params.resourceType - The resource type (e.g. "Patient",
   *   "Observation").
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resources in a FHIR Bundle structure.
   */
  typeHistory(params: {
    resourceType: ResourceType;
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource| FhirResource & { type: "history" }>;
  /**
   * Retrieve the change history for all resources.
   * @example
   * // Using promises
   * fhirClient.systemHistory();
   *           .then((data) => { console.log(data); });
   *
   * // Using async
   * let response = await fhirClient.systemHistory();
   * console.log(response);
   * @param [params] - The request parameters.
   * @param [params.headers] - DEPRECATED Optional custom headers to
   *   add to the request
   * @param [params.options] - Optional options object
   * @param [params.options.headers] - Optional headers to add to the
   *   request
   * @returns FHIR resources in a FHIR Bundle structure.
   */
  systemHistory(params?: {
    headers?: HeadersInit;
    options?: RequestInit;
  }): Promise<FhirResource| FhirResource & { type: "history" }>;
}
