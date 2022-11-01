# FHIRKit Client
[![npm version](https://badge.fury.io/js/fhir-kit-client.svg)](https://badge.fury.io/js/fhir-kit-client)
[![Build Status](https://github.com/Vermonster/fhir-kit-client/actions/workflows/node.js.yml/badge.svg)](https://github.com/Vermonster/fhir-kit-client/actions/workflows/node.js.yml)
[![Coverage Status](https://coveralls.io/repos/github/Vermonster/fhir-kit-client/badge.svg?branch=master)](https://coveralls.io/github/Vermonster/fhir-kit-client?branch=master)
[![GitHub license](https://img.shields.io/github/license/Vermonster/fhir-kit-client.svg)](https://github.com/Vermonster/fhir-kit-client/blob/master/LICENSE)

Node FHIR client library

## Features

* Support for R4 (4.0.1, 4.0.0, 3.5.0, 3.3.0, 3.2.0), STU3 (3.0.1, 1.8.0, 1.6.0, 1.4.0, 1.1.0) and DSTU2 (1.0.2)
* Support for all FHIR REST actions
* Support for FHIR operations
* Typescript support
* Pagination support for search results
* Batch and transaction support
* Support for absolute, in-bundle, and contained references
* Metadata caching on client instance
* SMART security support
* Capability-checking tool based on server capability statements
* Minimal dependencies
* Contemporary async/await structure
* Modern ES6 Classes
* TDD with Mocha
* URL polyfill (so it works in client-only apps without much trouble)
* Support optional parameters for the request, such as TLS key and cert

## Roadmap

Project roadmap uses [Github Projects](https://github.com/Vermonster/fhir-kit-client/projects/1).

## Typescript Support

There is now early Typescript support for this library. This library is
intended to be agnostic to the version of FHIR, but there is a WIP pattern to
use with @types/fhir.

Assume a project where you did the following setup:
```
> npm install fhir-kit-client
> npm install -D @types/fhir
```

Now in your code, you can:

```typescript
import Client from 'fhir-kit-client'

const client = new Client({ baseUrl: 'http://foo.com' })

const isPatient = (resource: fhir4.Resource): resource is fhir4.Patient => {
  return resource.resourceType === 'Patient'
}

client
  .read({resourceType: 'Patient', id: '12'})
  .then(res => {
    if (isPatient(res)) {
      console.dir(res.name, { depth: 4})
    }
  })
```

This example uses a type guard for R4 Patient. If you are building an app that
connects to systems with different versions, you could write a wrapper for each
fhir version in your app.

## Examples

Examples using promises...

```javascript
const Client = require('fhir-kit-client');
const fhirClient = new Client({
  baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open'
  });

// Get SMART URLs for OAuth
fhirClient.smartAuthMetadata().then((response) => {
  console.log(response);
  });


// Direct request
fhirClient.request('Patient/123')
  .then(response => console.log(response));

fhirClient.request('Patient/123', { method: 'DELETE' })
  .then(response => console.log(response));

// Read a patient
fhirClient
  .read({ resourceType: 'Patient', id: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4' })
  .then((response) => {
    console.log(response);
  });


// Search for patients, and page through results
fhirClient
  .search({ resourceType: 'Patient', searchParams: { _count: '3', gender: 'female' } })
  .then((response) => {
    console.log(response);
    return response;
  })
  .then((response) => {
    console.log(response);
    return fhirClient.nextPage(response);
  })
  .then((response) => {
    console.log(response);
    return fhirClient.prevPage(response);
  })
  .catch((error) => {
    console.error(error);
  });
```

Examples using async/await...

```javascript
const Client = require('fhir-kit-client');
const fhirClient = new Client({
  baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open'
  });

async function asyncExamples() {
  // Get SMART URLs for OAuth
  let response = await fhirClient.smartAuthMetadata();
  console.log(response);


  // Read a patient
  response = await fhirClient
    .read({ resourceType: 'Patient', id: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4' });
  console.log(response);


  // Search for a patient with name matching abbott, then paging
  let searchResponse = await fhirClient
    .search({ resourceType: 'Patient', searchParams: { name: 'abbott ' } })
  console.log(searchResponse);

  searchResponse = await fhirClient.nextPage(searchResponse);
  console.log(searchResponse);

  searchResponse = await fhirClient.prevPage(searchResponse);
  console.log(searchResponse);
}

asyncExamples();
```

For more examples see the JS Docs and Launch Examples below.

## Documentation

[JSDoc-generated documentation with plenty of examples](https://vermonster.github.io/fhir-kit-client/fhir-kit-client/1.9.2/index.html)

## Launch Examples (SMART, CDS Hooks)

To see how to follow launch and authorization workflows for FHIR applications,
see the [examples directory](./examples/) and [examples README](./examples/README.md).

## Example React App

[FHIRKit Create React App](https://github.com/Vermonster/fhir-kit-create-react)
provides a [create-react-app](https://github.com/facebook/create-react-app)
template that can be used to create a sample React app using FHIRKit Client.

## Even more Examples (client-side ones)

See https://github.com/Vermonster/fhir-kit-client-examples for examples in React,
Angular, and React Native.

## Logging

The [debug library](https://www.npmjs.com/package/debug) can provide logging
during development. Two different logging namespaces are provided, `fhir-kit-
client:info` logs each request and response, and `fhir-kit-client:error` logs
errors. To enable logging during development, add one of the namespaces to the
DEBUG environment variable, or use `fhir-kit-client:*` to enable both.

```
$ DEBUG=fhir-kit-client:* node smart-launch.js
```

## Contributing

FHIRKit Client is an open source Node.js FHIR client library that welcomes
community contributions with enthusiasm.

All are welcome to participate. By participating in this project, you agree to
follow the [Code of
Conduct](https://github.com/Vermonster/fhir-kit-client/blob/master/CODE_OF_CONDUCT.md).

Please see our
[Contributing](https://github.com/Vermonster/fhir-kit-client/blob/master/CONTRIBUTING.md)
document for more details on how to get started.

## License

MIT

Copyright (c) 2018 Vermonster LLC
