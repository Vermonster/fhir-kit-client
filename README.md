# FHIRKit Client

[![npm version](https://badge.fury.io/js/fhir-kit-client.svg)](https://badge.fury.io/js/fhir-kit-client)
[![Build Status](https://github.com/Vermonster/fhir-kit-client/actions/workflows/node.js.yml/badge.svg)](https://github.com/Vermonster/fhir-kit-client/actions/workflows/node.js.yml)
[![GitHub license](https://img.shields.io/github/license/Vermonster/fhir-kit-client.svg)](https://github.com/Vermonster/fhir-kit-client/blob/master/LICENSE)

**[API Documentation →](https://vermonster.github.io/fhir-kit-client/)**

Node.js FHIR R4 client library — TypeScript-first, ESM-only, zero polyfills.

> **v2 requires Node 18+.** It uses native `fetch`, `AbortController`, and `URLSearchParams`.
> CommonJS (`require`) is not supported. See the [migration guide](#migrating-from-v1) if upgrading.

## Features

- Full TypeScript source — types included, no `@types/fhir-kit-client` needed
- All FHIR REST interactions (read, vread, create, update, patch, delete, history)
- FHIR search: resource, compartment, system (GET and POST forms)
- FHIR operations (`$everything`, `$validate`, etc.)
- Batch and transaction bundles
- Reference resolution: absolute, relative, in-bundle, and contained (`#`)
- SMART App Launch — authorization URL discovery via capability statement or `.well-known`
- Capability-checking tool (`CapabilityTool`)
- Pagination helpers (`nextPage` / `prevPage`)
- Custom request signer hook (AWS SigV4, HMAC, etc.)
- Bearer token support
- Debug logging via the [`debug`](https://www.npmjs.com/package/debug) package
- Minimal dependencies (only `agentkeepalive` and `debug`)

## Installation

```sh
npm install fhir-kit-client
```

### Optional: TypeScript type packages

```sh
# Ambient FHIR R4/R4B/R5 namespace types (fhir4.Patient, fhir4.Bundle, …)
npm install --save-dev @types/fhir

# Runtime Zod schemas + inferred TypeScript types
npm install @reasonhealth/fhir-zod zod
```

## Quick Start

```ts
import { Client } from 'fhir-kit-client';

const client = new Client({ baseUrl: 'https://r4.smarthealthit.org' });

// Read a patient
const patient = await client.read({ resourceType: 'Patient', id: '123' });
console.log(patient.resourceType); // 'Patient'

// Search
const bundle = await client.search({
  resourceType: 'Patient',
  searchParams: { name: 'Smith', _count: '10' },
});
```

## TypeScript Types

### With `@types/fhir` (ambient namespace types)

`@types/fhir` adds ambient globals like `fhir4.Patient`, `fhir4.Bundle`, etc.
Use a type guard to narrow the generic `FhirResource` returned by the client:

```ts
import { Client } from 'fhir-kit-client';

const client = new Client({ baseUrl: 'https://r4.smarthealthit.org' });

function isPatient(r: fhir4.Resource): r is fhir4.Patient {
  return r.resourceType === 'Patient';
}

function isBundle(r: fhir4.Resource): r is fhir4.Bundle {
  return r.resourceType === 'Bundle';
}

// Read and narrow
const resource = await client.read({ resourceType: 'Patient', id: '123' });
if (isPatient(resource)) {
  // resource is now fhir4.Patient
  console.log(resource.name?.[0]?.family);
}

// Search and iterate bundle entries
const result = await client.search({
  resourceType: 'Observation',
  searchParams: { patient: '123', _count: '20' },
});
if (isBundle(result)) {
  for (const entry of result.entry ?? []) {
    console.log(entry.resource?.resourceType, entry.resource?.id);
  }
}
```

### With `@reasonhealth/fhir-zod` (runtime validation + inferred types)

`@reasonhealth/fhir-zod` provides Zod schemas generated from official FHIR StructureDefinitions.
Use them to validate server responses at runtime and get fully-typed resources without `@types/fhir`.

```ts
import { Client } from 'fhir-kit-client';
import { PatientSchema, BundleSchema, ObservationSchema } from '@reasonhealth/fhir-zod/r4';
import type { z } from 'zod';

type Patient = z.infer<typeof PatientSchema>;
type Bundle  = z.infer<typeof BundleSchema>;

const client = new Client({ baseUrl: 'https://r4.smarthealthit.org' });

// Parse and validate — throws ZodError if the response doesn't conform
const raw = await client.read({ resourceType: 'Patient', id: '123' });
const patient: Patient = PatientSchema.parse(raw);
console.log(patient.name?.[0]?.family);

// Safe parse — inspect errors without throwing
const result = ObservationSchema.safeParse(
  await client.read({ resourceType: 'Observation', id: 'obs-1' })
);
if (result.success) {
  console.log('Status:', result.data.status);
} else {
  console.error('Invalid Observation:', result.error.flatten());
}
```

#### Validate a search Bundle

```ts
import { BundleSchema, PatientSchema } from '@reasonhealth/fhir-zod/r4';

const raw = await client.search({ resourceType: 'Patient', searchParams: { name: 'Smith' } });
const bundle = BundleSchema.parse(raw);

const patients = (bundle.entry ?? [])
  .map(e => e.resource)
  .filter((r): r is NonNullable<typeof r> => r?.resourceType === 'Patient')
  .map(r => PatientSchema.parse(r));

console.log(`Found ${patients.length} patient(s)`);
```

#### Discriminated union across resource types

```ts
import { z } from 'zod';
import { PatientSchema, PractitionerSchema, RelatedPersonSchema } from '@reasonhealth/fhir-zod/r4';

const SubjectSchema = z.discriminatedUnion('resourceType', [
  PatientSchema,
  PractitionerSchema,
  RelatedPersonSchema,
]);
type Subject = z.infer<typeof SubjectSchema>;

function parseSubject(raw: unknown): Subject {
  return SubjectSchema.parse(raw);
}
```

#### Using both `@types/fhir` and `@reasonhealth/fhir-zod` together

Use the Zod schema as a type guard that bridges to the ambient `fhir4` namespace types:

```ts
import { PatientSchema } from '@reasonhealth/fhir-zod/r4';

function isValidPatient(resource: fhir4.Resource): resource is fhir4.Patient {
  return PatientSchema.safeParse(resource).success;
}
```

## API Reference

### `new Client(config)`

```ts
import { Client } from 'fhir-kit-client';
import type { ClientConfig } from 'fhir-kit-client';

const client = new Client({
  baseUrl: 'https://r4.smarthealthit.org',   // required
  bearerToken: 'eyJ...',                      // optional, sets Authorization header
  customHeaders: { 'X-Tenant': 'acme' },      // optional, sent with every request
  requestSigner: (url, init) => {             // optional, for custom auth (e.g. AWS SigV4)
    init.headers = { ...init.headers, 'X-Custom-Sig': sign(url) };
  },
});
```

Properties can be updated after construction:

```ts
client.baseUrl = 'https://other-server.org/fhir';
client.bearerToken = newToken;
client.customHeaders = { 'X-Tenant': 'new-tenant' };
```

### Read

```ts
// Read a resource by type and id
const patient = await client.read({ resourceType: 'Patient', id: '123' });

// Read a specific version
const v1 = await client.vread({ resourceType: 'Patient', id: '123', version: '1' });
```

### Create

```ts
const created = await client.create({
  resourceType: 'Patient',
  body: { resourceType: 'Patient', name: [{ family: 'Smith', given: ['Jane'] }] },
});

// With Prefer: return=minimal (server returns 201 with empty body)
const minimal = await client.create({
  resourceType: 'Patient',
  body: { resourceType: 'Patient', name: [{ family: 'Smith' }] },
  options: { headers: { Prefer: 'return=minimal' } },
});
const { response } = Client.httpFor(minimal);
console.log(response?.status);          // 201
console.log(response?.headers.get('Location')); // Location header
```

### Update

```ts
// Update by id
await client.update({ resourceType: 'Patient', id: '123', body: updatedPatient });

// Conditional update
await client.update({
  resourceType: 'Patient',
  searchParams: { identifier: 'system|value' },
  body: updatedPatient,
});
```

### Patch (JSON Patch, RFC 6902)

```ts
await client.patch({
  resourceType: 'Patient',
  id: '123',
  jsonPatch: [
    { op: 'replace', path: '/active', value: false },
    { op: 'add', path: '/name/-', value: { use: 'nickname', text: 'Jay' } },
  ],
});
```

### Delete

```ts
await client.delete({ resourceType: 'Patient', id: '123' });
```

### Search

```ts
// Resource-type search (GET)
const bundle = await client.search({
  resourceType: 'Patient',
  searchParams: { name: 'Smith', birthdate: 'lt1990-01-01', _count: '20' },
});

// System-wide search
const all = await client.search({ searchParams: { _type: 'Patient,Practitioner' } });

// Compartment search
const conditions = await client.search({
  resourceType: 'Condition',
  compartment: { resourceType: 'Patient', id: '123' },
});

// POST-based search (when params exceed URL length)
const postResult = await client.search({
  resourceType: 'Patient',
  searchParams: { identifier: longList },
  options: { postSearch: true },
});
```

### Direct methods: `resourceSearch`, `compartmentSearch`, `systemSearch`

```ts
await client.resourceSearch({ resourceType: 'Observation', searchParams: { patient: '123' } });
await client.systemSearch({ searchParams: { _type: 'Patient' } });
await client.compartmentSearch({
  resourceType: 'MedicationRequest',
  compartment: { resourceType: 'Patient', id: '123' },
});
```

### Operations

```ts
// System operation (POST)
await client.operation({ name: 'convert', input: bundle });

// Type-level operation (GET with params)
await client.operation({
  name: 'translate',
  resourceType: 'ConceptMap',
  method: 'GET',
  input: { url: 'http://example.com/map', code: '73211009', system: 'http://snomed.info/sct' },
});

// Instance-level operation
await client.operation({ name: 'everything', resourceType: 'Patient', id: '123' });
await client.operation({ name: 'apply',      resourceType: 'PlanDefinition', id: 'pd-1' });
await client.operation({ name: 'validate',   resourceType: 'Patient', input: rawPatient });
```

### Batch and Transaction

```ts
const batchBundle = {
  resourceType: 'Bundle',
  type: 'batch',
  entry: [
    { request: { method: 'GET', url: 'Patient/123' } },
    { request: { method: 'GET', url: 'Observation?patient=123&_count=5' } },
  ],
};
const batchResult = await client.batch({ body: batchBundle });

const txBundle = { resourceType: 'Bundle', type: 'transaction', entry: [...] };
const txResult  = await client.transaction({ body: txBundle });
```

### History

```ts
// Instance history
await client.history({ resourceType: 'Patient', id: '123' });

// Type history
await client.history({ resourceType: 'Patient' });

// System history
await client.history();
```

### Pagination

```ts
let bundle = await client.search({
  resourceType: 'Patient',
  searchParams: { _count: '10' },
});

// Walk forward through all pages
while (bundle) {
  processBatch(bundle);
  bundle = await client.nextPage({ bundle }) ?? null;
}

// Or go backwards
const prevBundle = await client.prevPage({ bundle });
```

### SMART App Launch — `smartAuthMetadata`

Discovers SMART authorization URLs from the `.well-known/smart-configuration` endpoint,
the capability statement, or `.well-known/openid-configuration`. The first successful
response wins (race).

```ts
import { Client } from 'fhir-kit-client';
import type { SmartAuthMetadata } from 'fhir-kit-client';

const client = new Client({ baseUrl: 'https://launch.smarthealthit.org/v/r4/fhir' });
const { authorizeUrl, tokenUrl, registerUrl } = await client.smartAuthMetadata();

console.log(authorizeUrl?.toString()); // 'https://.../authorize'
console.log(tokenUrl?.toString());     // 'https://.../token'
```

### CapabilityStatement & CapabilityTool

```ts
import { Client, CapabilityTool } from 'fhir-kit-client';

const client = new Client({ baseUrl: 'https://r4.smarthealthit.org' });
const cs = await client.capabilityStatement();
const tool = new CapabilityTool(cs);

// Server-level
tool.serverCan('transaction');                          // boolean
tool.serverSearch('_id');                               // boolean
tool.supportFor({ capabilityType: 'interaction', where: { code: 'history-system' } });

// Resource-level
tool.resourceCan('Patient', 'create');                  // boolean
tool.resourceSearch('Patient', 'birthdate');            // boolean
tool.interactionsFor({ resourceType: 'Patient' });      // string[]
tool.searchParamsFor({ resourceType: 'Patient' });      // string[]
tool.resourceCapabilities({ resourceType: 'Patient' }); // raw capability object
tool.capabilityContents({ resourceType: 'Patient', capabilityType: 'conditionalDelete' });
```

### Reference Resolution

```ts
// Absolute, relative, and in-bundle references
const referenced = await client.resolve({ reference: 'Patient/123' });
const absolute   = await client.resolve({ reference: 'https://server.org/fhir/Patient/456' });

// In-bundle or contained — supply the context bundle/resource
const contained = await client.resolve({
  reference: '#condition-1',
  context: patient,
});
const bundleRef = await client.resolve({
  reference: 'Patient/123',
  context: bundle,
});
```

### Raw Request

```ts
const patient   = await client.request('Patient/123');
const deleted   = await client.request('Patient/123', { method: 'DELETE' });
const created   = await client.request('Patient', { method: 'POST', body: newPatient });
```

### Inspecting the HTTP Request/Response

Every FHIR response object carries hidden `__request` and `__response` properties
that expose the underlying `Request` and `Response` objects.

```ts
import { Client } from 'fhir-kit-client';

const result = await client.read({ resourceType: 'Patient', id: '123' });
const { request, response } = Client.httpFor(result);

console.log(request?.url);         // 'https://server.org/fhir/Patient/123'
console.log(response?.status);     // 200
console.log(response?.headers.get('etag'));
```

### Custom Request Signer (AWS SigV4, HMAC, etc.)

```ts
import { Client } from 'fhir-kit-client';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-browser';

const signer = new SignatureV4({
  credentials: fromNodeProviderChain(),
  region: 'us-east-1',
  service: 'healthlake',
  sha256: Sha256,
});

const client = new Client({
  baseUrl: 'https://healthlake.us-east-1.amazonaws.com/datastore/<id>/r4',
  requestSigner: async (url, options) => {
    const signed = await signer.sign({
      method: options.method ?? 'GET',
      headers: options.headers as Record<string, string>,
      hostname: new URL(url).hostname,
      path: new URL(url).pathname,
      protocol: 'https',
      body: options.body as string | undefined,
    });
    Object.assign(options.headers!, signed.headers);
  },
});
```

## Logging

Uses the [`debug`](https://www.npmjs.com/package/debug) package.

| Namespace | Content |
|---|---|
| `fhir-kit-client:info` | Every request URL and response status |
| `fhir-kit-client:error` | Errors |

```sh
# Enable all logging during development
DEBUG=fhir-kit-client:* node app.js

# Requests/responses only
DEBUG=fhir-kit-client:info node app.js
```

## Migrating from v1

| v1 | v2 |
|---|---|
| `require('fhir-kit-client')` | `import { Client } from 'fhir-kit-client'` |
| Node 12+ | Node 18+ required |
| `cross-fetch`, `node-abort-controller` polyfills | Native `fetch`, `AbortController` |
| `client.read({…, headers: {…}})` | `client.read({…, options: { headers: {…} }})` |
| `client.nextPage(bundle)` | `client.nextPage({ bundle })` |
| `query-string` (alpha sort) | `URLSearchParams` (insertion order) |
| `fhir-kit-client` default export | Named export `Client` |

## Examples

See the [examples directory](./examples/) for runnable SMART App Launch and CDS Hooks examples.

## Contributing

FHIRKit Client welcomes community contributions.
All participants must follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT — Copyright (c) 2018 Vermonster LLC

