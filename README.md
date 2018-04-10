[![Build Status](https://travis-ci.org/Vermonster/fhir-kit-client.svg?branch=master)](https://travis-ci.org/Vermonster/fhir-kit-client) [![Coverage Status](https://coveralls.io/repos/github/Vermonster/fhir-kit-client/badge.svg?branch=master)](https://coveralls.io/github/Vermonster/fhir-kit-client?branch=master)

# fhir-kit-client
Node FHIR client library

# Features

* Support for STU3 (3.0.1, 1.8.0, 1.6.0, 1.4.0, 1.1.0) and DSTU2 (1.0.2)
* Minimal dependencies
* Contemporary async/await structure
* Modern Class getter/setter
* TDD with Mocha

# Example

Examples using promises...

```javascript
const Client = require('../lib/client');
const fhirClient = new Client({ baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open' });

fhirClient.smartAuthMetadata().then((response) => {
  console.log(response);
});

fhirClient
  .read({ resourceType: 'Patient', id: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4' })
  .then((response) => {
    console.log(response);
  });

fhirClient
  .vread({ resourceType: 'Patient', id: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4', version: '1' })
  .then((response) => {
    console.log(response);
  });

fhirClient
  .search({ resourceType: 'Patient', searchParams: { name: 'abbott ' } })
  .then((response) => {
    console.log(response);
  });

```

Examples using async/await...

```javascript
const Client = require('../lib/client');
const fhirClient = new Client({ baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open' });

async function asyncExamples() {
  let response = await fhirClient.smartAuthMetadata();
  console.log(response);

  console.log('-------- waiting...');

  response = await fhirClient
    .read({ resourceType: 'Patient', id: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4' })
  console.log(response);

  console.log('-------- waiting...');

  response = await fhirClient
    .vread({ resourceType: 'Patient', id: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4', version: '1' })
  console.log(response);

  console.log('-------- waiting...');

  response = await fhirClient.search({ resourceType: 'Patient', searchParams: { name: 'abbott ' } })
  console.log(response);
}

asyncExamples();
```

See the [SMART Launch](./examples/smart-launch.js) example with OAuth2 support.

# Documentation

[JSDoc-generated documentation](https://vermonster.github.io/fhir-kit-client/fhir-client/0.1.0/)

# Logging

The [debug library](https://www.npmjs.com/package/debug) can provide logging
during development. Two different logging namespaces are provided, `fhir-kit-
client:info` logs each request and response, and `fhir-kit-client:error` logs
errors. To enable logging during development, add one of the namespaces to the
DEBUG environment variable, or use `fhir-kit-client:*` to enable both.

```
$ DEBUG=fhir-kit-client:* node smart-launch.js
```

# Todo



# Contributing

All are welcome to contribute. By participating in this project you agree to
follow the [Code of
Conduct](https://github.com/Vermonster/node-fhir-client/blob/master/CODE_OF_CONDUCT.md).


# License

MIT

Copyright (c) 2018 Vermonster LLC
