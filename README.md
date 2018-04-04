[![Build Status](https://travis-ci.org/Vermonster/node-fhir-client.svg?branch=master)](https://travis-ci.org/Vermonster/node-fhir-client)

[![Coverage Status](https://coveralls.io/repos/github/Vermonster/node-fhir-client/badge.svg?branch=master)](https://coveralls.io/github/Vermonster/node-fhir-client?branch=master)

# fhir-client
Node FHIR client library

# Features

* Node
* Minimal dependencies
* Contemporary async/await structure
* Modern Class getter/setter
* TDD with Mocha

# Example

[See examples](./examples/index.js)

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

# License

MIT

(c)2018 Vermonster LLC
