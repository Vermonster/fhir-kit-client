[![Build Status](https://travis-ci.org/Vermonster/node-fhir-client.svg?branch=master)](https://travis-ci.org/Vermonster/node-fhir-client) [![Coverage Status](https://coveralls.io/repos/github/Vermonster/node-fhir-client/badge.svg?branch=master)](https://coveralls.io/github/Vermonster/node-fhir-client?branch=master)

# fhir-client
Node FHIR client library

# Features

* Node
* Minimal dependencies
* Contemporary async/await structure
* Modern Class getter/setter
* TDD with Mocha

# Example

```javascript
const Client = require('../lib/client');

const fhirClient = new Client({ baseUrl: 'https://sb-fhir-stu3.smarthealthit.org/smartstu3/open' });

const examplePatient = { resourceType: 'Patient', identifier: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4' };
const examplePatientV1 = { resourceType: 'Patient', identifier: '2e27c71e-30c8-4ceb-8c1c-5641e066c0a4', version: '1' };
const exampleNamedPatient = { resourceType: 'Patient', searchParams: { name: 'abbott ' } };

// Examples using promises...
fhirClient.smartAuthMetadata().then((response) => {
  console.log(response);
});

fhirClient.read(examplePatient).then((response) => {
  console.log(response);
});

fhirClient.vread(examplePatientV1).then((response) => {
  console.log(response);
});

fhirClient.search(exampleNamedPatient).then((response) => {
  console.log(response);
});


// Examples using async/await...
async function asyncExamples() {
  let response = await fhirClient.smartAuthMetadata();
  console.log(response);

  console.log('--------');

  response = await fhirClient.read(examplePatient);
  console.log(response);

  console.log('--------');

  response = await fhirClient.vread(examplePatientV1);
  console.log(response);

  console.log('--------');

  response = await fhirClient.search(exampleNamedPatient);
  console.log(response);
}

asyncExamples();
```

See the [SMART Launch](./examples/smart-launch.js) example with OAuth2 support.

# Documentation

[JSDoc-generated documentation](https://vermonster.github.io/node-fhir-client/fhir-client/0.1.0/)

# Logging

The [debug library](https://www.npmjs.com/package/debug) can provide logging
during development. Two different logging namespaces are provided, `node-fhir-
client:info` logs each request and response, and `node-fhir-client:error` logs
errors. To enable logging during development, add one of the namespaces to the
DEBUG environment variable, or use `node-fhir-client:*` to enable both.
```
$ DEBUG=node-fhir-client:* node examples/index.js
```

# Todo

# Contributing

All are welcome to contribute. By participating in this project you agree to follow the [Code of Conduct](https://github.com/Vermonster/node-fhir-client/blob/master/CODE_OF_CONDUCT.md).


# License

MIT

(c)2018 Vermonster LLC
